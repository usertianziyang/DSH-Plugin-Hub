import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { filterLowValueRepos } from "../src/filter-plugins";
import type { PluginItem, Snapshot } from "../src/types";

const API_BASE_URL = "https://api.github.com";
const TOPIC = "dsh-plugin";
const TOPIC_URL = "https://github.com/topics/dsh-plugin";
const SOURCE = "github-rest-search";
const MIN_CREATED_AT = "2008-01-01";
const PER_PAGE = 100;
const MAX_RESULTS_PER_SHARD = 1000;
const SEARCH_INTERVAL_MS = 2100;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_SERVER_RETRIES = 3;
const BACKOFF_MS = [2000, 5000, 10_000];
const SHARD_RETRY_ATTEMPTS = 2;
const API_VERSION = "2022-11-28";

// ---------------------------------------------------------------------------
// Raw GitHub REST types (subset of the search/repositories item shape).
// ---------------------------------------------------------------------------

export interface GitHubOwner {
  login: string;
  avatar_url: string;
}

export interface GitHubLicense {
  spdx_id: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubOwner | null;
  html_url: string;
  homepage: string | null;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license: GitHubLicense | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface SyncDeps {
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
  token: string;
  log?: (message: string) => void;
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Per-run collection diagnostics. `missingRepositories` is the part of the
 * snapshot that GitHub claimed to hold but never returned; it is published in
 * `meta.count_deficit` so the size of that blind spot stays observable.
 */
export interface SyncStats {
  /** Shards measured during this run. */
  shards: number;
  /** Repositories counted by GitHub but never retrievable, summed over shards. */
  missingRepositories: number;
  /** Largest single-shard deficit that was tolerated. */
  largestDeficit: number;
  /** Shards whose deficit disappeared after a drift re-fetch. */
  recoveredShards: number;
  /** Shards recovered by re-sharding into a finer dimension. */
  reshardedShards: number;
}

function safeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// ---------------------------------------------------------------------------
// Date helpers (all UTC, ISO "YYYY-MM-DD" strings).
// ---------------------------------------------------------------------------

export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

export function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000);
}

/**
 * Split a closed date range into two adjacent, non-overlapping, gap-free
 * closed ranges. Returns null when the range is a single day (cannot split).
 */
export function splitDateRange(range: DateRange): [DateRange, DateRange] | null {
  const totalDays = daysBetween(range.start, range.end);
  if (totalDays <= 0) {
    return null;
  }
  const leftEnd = addDays(range.start, Math.floor(totalDays / 2));
  const rightStart = addDays(leftEnd, 1);
  return [
    { start: range.start, end: leftEnd },
    { start: rightStart, end: range.end },
  ];
}

// ---------------------------------------------------------------------------
// Query building and mapping.
// ---------------------------------------------------------------------------

export interface StarsRange {
  min: number;
  max: number;
}

export function buildQuery(start: string, end: string, stars?: StarsRange): string {
  let query = `topic:${TOPIC} created:${start}..${end}`;
  if (stars) {
    query += ` stars:${stars.min}..${stars.max}`;
  }
  return query;
}

export function mapRepository(repo: GitHubRepo): PluginItem {
  const homepage =
    typeof repo.homepage === "string" && repo.homepage.trim() !== ""
      ? repo.homepage
      : null;
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: repo.owner?.login ?? "",
    owner_avatar_url: repo.owner?.avatar_url ?? "",
    url: repo.html_url,
    homepage,
    description: repo.description ?? null,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    language: repo.language ?? null,
    license: repo.license?.spdx_id ?? null,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    fork: repo.fork === true,
    archived: repo.archived === true,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
  };
}

export function dedupeById(items: PluginItem[]): PluginItem[] {
  const byId = new Map<number, PluginItem>();
  for (const item of items) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

export function sortItems(items: PluginItem[]): PluginItem[] {
  return [...items].sort(
    (a, b) =>
      b.stars - a.stars ||
      a.full_name.localeCompare(b.full_name, "en"),
  );
}

// ---------------------------------------------------------------------------
// Snapshot validation.
// ---------------------------------------------------------------------------

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const GITHUB_REPO_URL_PATTERN = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/;

export function validateSnapshot(snapshot: Snapshot): ValidationResult {
  const errors: string[] = [];
  const { meta } = snapshot;

  if (meta.topic !== TOPIC) {
    errors.push(`meta.topic must be "${TOPIC}"`);
  }
  if (meta.topic_url !== TOPIC_URL) {
    errors.push(`meta.topic_url must be "${TOPIC_URL}"`);
  }
  if (!Number.isInteger(meta.total_count) || meta.total_count < 0) {
    errors.push("meta.total_count must be a non-negative integer");
  }
  if (meta.total_count !== snapshot.items.length) {
    errors.push(
      `meta.total_count (${meta.total_count}) != items.length (${snapshot.items.length})`,
    );
  }
  if (
    meta.count_deficit !== undefined &&
    (!Number.isInteger(meta.count_deficit) || meta.count_deficit < 0)
  ) {
    errors.push("meta.count_deficit must be a non-negative integer when present");
  }

  const seenIds = new Set<number>();
  for (const item of snapshot.items) {
    if (seenIds.has(item.id)) {
      errors.push(`duplicate repository id: ${item.id}`);
      continue;
    }
    seenIds.add(item.id);

    if (!Array.isArray(item.topics) || !item.topics.includes(TOPIC)) {
      errors.push(`${item.full_name}: missing exact topic "${TOPIC}"`);
    }
    if (typeof item.url !== "string" || !GITHUB_REPO_URL_PATTERN.test(item.url)) {
      errors.push(`${item.full_name}: invalid repository URL`);
    }
    for (const field of ["stars", "forks", "open_issues"] as const) {
      const value = item[field];
      if (!Number.isInteger(value) || value < 0) {
        errors.push(`${item.full_name}: ${field} must be a non-negative integer`);
      }
    }
  }

  const sorted = sortItems(snapshot.items);
  for (let i = 0; i < snapshot.items.length; i++) {
    if (sorted[i].id !== snapshot.items[i].id) {
      errors.push("items are not globally sorted by stars desc, full_name asc");
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// GitHub Search client: throttle, timeout, retry, rate-limit handling.
// ---------------------------------------------------------------------------

export class GitHubSearchClient {
  private lastRequestAt = 0;
  readonly stats: SyncStats = {
    shards: 0,
    missingRepositories: 0,
    largestDeficit: 0,
    recoveredShards: 0,
    reshardedShards: 0,
  };

  constructor(private readonly deps: SyncDeps) {}

  log(message: string): void {
    this.deps.log?.(message);
  }

  async search(params: {
    start: string;
    end: string;
    page: number;
    stars?: StarsRange;
  }): Promise<SearchResponse> {
    await this.throttle();
    const url = this.buildUrl(params);
    let attempt = 0;

    for (;;) {
      attempt += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await this.deps.fetchImpl(url, {
          method: "GET",
          headers: this.headers(),
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeout);
        if (attempt <= MAX_SERVER_RETRIES) {
          this.log(`Network error; retry ${attempt}/${MAX_SERVER_RETRIES}: ${safeMessage(error)}`);
          await this.deps.sleep(BACKOFF_MS[attempt - 1] ?? 10_000);
          continue;
        }
        throw new Error(`Network error after ${MAX_SERVER_RETRIES} retries: ${safeMessage(error)}`);
      }
      clearTimeout(timeout);

      if (response.ok) {
        const body = await this.parseResponse(response);
        if (body.incomplete_results) {
          if (attempt <= MAX_SERVER_RETRIES) {
            this.log(`incomplete_results=true; retry ${attempt}/${MAX_SERVER_RETRIES}`);
            await this.deps.sleep(BACKOFF_MS[attempt - 1] ?? 10_000);
            continue;
          }
          throw new Error(
            "Search returned incomplete_results=true persistently; refusing to publish partial data.",
          );
        }
        return body;
      }

      if (response.status === 429) {
        await this.handleRateLimit(response);
        continue;
      }
      if (response.status === 403) {
        const remaining = response.headers.get("x-ratelimit-remaining");
        const retryAfter = response.headers.get("retry-after");
        if (remaining === "0" || retryAfter !== null) {
          await this.handleRateLimit(response);
          continue;
        }
        throw new Error("Forbidden (HTTP 403): check GITHUB_TOKEN permissions.");
      }
      if (response.status === 401) {
        throw new Error("Authentication failed (HTTP 401): GITHUB_TOKEN is invalid or expired.");
      }
      if (response.status >= 500 && response.status <= 504) {
        if (attempt <= MAX_SERVER_RETRIES) {
          this.log(`HTTP ${response.status}; retry ${attempt}/${MAX_SERVER_RETRIES}`);
          await this.deps.sleep(BACKOFF_MS[attempt - 1] ?? 10_000);
          continue;
        }
        throw new Error(`Server error (HTTP ${response.status}) after ${MAX_SERVER_RETRIES} retries.`);
      }
      throw new Error(`Unexpected HTTP ${response.status}.`);
    }
  }

  private buildUrl(params: {
    start: string;
    end: string;
    page: number;
    stars?: StarsRange;
  }): URL {
    const url = new URL("/search/repositories", API_BASE_URL);
    url.searchParams.set("q", buildQuery(params.start, params.end, params.stars));
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(params.page));
    return url;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "dsh-plugin-index",
    };
    if (this.deps.token) {
      headers.Authorization = `Bearer ${this.deps.token}`;
    }
    return headers;
  }

  private async throttle(): Promise<void> {
    const now = this.deps.now().getTime();
    const elapsed = now - this.lastRequestAt;
    if (this.lastRequestAt > 0 && elapsed < SEARCH_INTERVAL_MS) {
      await this.deps.sleep(SEARCH_INTERVAL_MS - elapsed);
    }
    this.lastRequestAt = this.deps.now().getTime();
  }

  private async handleRateLimit(response: Response): Promise<void> {
    const retryAfter = response.headers.get("retry-after");
    let waitMs: number;
    if (retryAfter !== null) {
      waitMs = Number(retryAfter) * 1000 + 1000;
    } else {
      const reset = response.headers.get("x-ratelimit-reset");
      if (reset !== null) {
        waitMs = Math.max(0, Number(reset) * 1000 - this.deps.now().getTime()) + 1000;
      } else {
        waitMs = 60_000;
      }
    }
    if (!Number.isFinite(waitMs) || waitMs < 0) {
      waitMs = 60_000;
    }
    this.log(`Rate limited; waiting ~${Math.round(waitMs / 1000)}s.`);
    await this.deps.sleep(waitMs);
  }

  private async parseResponse(response: Response): Promise<SearchResponse> {
    const body = (await response.json()) as Partial<SearchResponse>;
    if (
      typeof body.total_count !== "number" ||
      !Array.isArray(body.items) ||
      typeof body.incomplete_results !== "boolean"
    ) {
      throw new Error("Unexpected search response structure.");
    }
    return body as SearchResponse;
  }
}

// ---------------------------------------------------------------------------
// Collection: recursive date sharding + pagination + per-shard integrity.
// ---------------------------------------------------------------------------

interface ShardParams {
  start: string;
  end: string;
  stars?: StarsRange;
}

function shardLabel(params: ShardParams): string {
  return params.stars
    ? `${params.start}..${params.end} stars:${params.stars.min}..${params.stars.max}`
    : `${params.start}..${params.end}`;
}

/**
 * Upper bound on how many repositories a shard may fail to retrieve while still
 * being published.
 *
 * GitHub Search is served by two different indexes: `total_count` comes from a
 * counting index, while result pages come from a retrieval index. They are only
 * eventually consistent, and they can disagree in a *stable* way for a single
 * document — typically a repository that was deleted, renamed, made private or
 * flagged after it was indexed, so it is still counted but can never be
 * retrieved.
 *
 * Measured against the live API on 2026-10-09 for
 * `topic:dsh-plugin created:2026-09-02T15:14:49Z..2026-09-02T15:14:49Z`:
 * `total_count=1`, `items=[]`. The same document is missing from the whole-day,
 * whole-topic, alternate-sort and GraphQL variants, and no amount of re-sharding
 * (date → stars → creation time, down to one second) makes it retrievable. A
 * strict `unique === total_count` gate is therefore unsatisfiable, and it is the
 * reason the scheduled sync started failing on 2026-09-30.
 *
 * A deficit of at most this many repositories per shard is treated as that
 * inherent limitation: it is logged, tallied in `meta.count_deficit`, and
 * tolerated. A larger deficit still means real truncation and fails the sync.
 */
export const MAX_SHARD_DEFICIT = 3;

/**
 * Tolerated deficit for a shard: one repository per page of results, capped at
 * `MAX_SHARD_DEFICIT`.
 */
export function maxShardDeficit(total: number): number {
  return Math.max(1, Math.min(MAX_SHARD_DEFICIT, Math.ceil(total / PER_PAGE)));
}

/**
 * Cap on re-shard recoveries per run. Each recovery replays a failing shard on a
 * finer dimension; without a cap, a systemic failure (e.g. GitHub serving short
 * pages for everything) would spend the run budget amplifying itself deeper into
 * the split tree instead of failing fast.
 */
const MAX_RESHARD_RECOVERIES = 20;

function claimReshardBudget(client: GitHubSearchClient): boolean {
  if (client.stats.reshardedShards >= MAX_RESHARD_RECOVERIES) {
    return false;
  }
  client.stats.reshardedShards += 1;
  return true;
}

/** One pagination pass over a shard. */
interface ShardOutcome {
  items: PluginItem[];
  /** `total_count` reported by the page-1 response of this pass. */
  total: number;
  /** Unique repositories retrieved. */
  unique: number;
  /** Raw items retrieved, before de-duplication. */
  fetched: number;
}

/** Cross-page duplicates: the fingerprint of offset-pagination drift. */
function duplicateEntries(outcome: ShardOutcome): number {
  return outcome.fetched - outcome.unique;
}

/** Repositories GitHub counted but did not return. Negative means it under-counted. */
function countDeficit(outcome: ShardOutcome): number {
  return outcome.total - outcome.unique;
}

/**
 * A shard is acceptable when it was paginated exhaustively (we always request
 * `ceil(total / PER_PAGE)` pages) and nothing that GitHub will serve is missing.
 *
 * Coverage is what matters, not page cleanliness:
 * - A complete result set is accepted even if pages overlapped on the way there.
 * - A short result set is accepted only when the pages did *not* overlap and the
 *   shortfall is within the count-index tolerance. Overlapping pages mean
 *   repositories were pushed out of the window by drift, so another pass (and,
 *   failing that, a finer dimension) is worth trying.
 */
function isShardAcceptable(outcome: ShardOutcome): boolean {
  const deficit = countDeficit(outcome);
  if (deficit <= 0) {
    return true;
  }
  if (duplicateEntries(outcome) > 0) {
    return false;
  }
  return deficit <= maxShardDeficit(outcome.total);
}

/**
 * Fetch every page of a shard and de-duplicate by repository id. The first page
 * is passed in (already requested) and is not re-requested here.
 */
async function fetchShardPages(
  client: GitHubSearchClient,
  params: ShardParams,
  total: number,
  first: SearchResponse,
): Promise<{ items: PluginItem[]; fetched: number }> {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const items: PluginItem[] = first.items.map(mapRepository);
  for (let page = 2; page <= pages; page++) {
    const response = await client.search({ ...params, page });
    items.push(...response.items.map(mapRepository));
  }
  return { items: dedupeById(items), fetched: items.length };
}

async function measureShard(
  client: GitHubSearchClient,
  params: ShardParams,
  total: number,
  first: SearchResponse,
): Promise<ShardOutcome> {
  const { items, fetched } = await fetchShardPages(client, params, total, first);
  return { items, total, unique: items.length, fetched };
}

/** Accept a shard, recording any tolerated deficit. */
function acceptShard(
  client: GitHubSearchClient,
  params: ShardParams,
  outcome: ShardOutcome,
): PluginItem[] {
  const deficit = countDeficit(outcome);
  if (deficit > 0) {
    client.stats.missingRepositories += deficit;
    client.stats.largestDeficit = Math.max(client.stats.largestDeficit, deficit);
    client.log(
      `Shard ${shardLabel(params)}: GitHub counted ${outcome.total} but returned ` +
        `${outcome.unique} (deficit ${deficit}, tolerance ${maxShardDeficit(outcome.total)}); ` +
        `accepting the count-index overshoot.`,
    );
  }
  return outcome.items;
}

/**
 * Signals that a shard could not be collected acceptably: either its pages
 * overlapped (drift) or it missed more repositories than the count-index
 * tolerance allows. Callers that have a finer orthogonal dimension may recover
 * by re-sharding instead of failing.
 */
class ShardIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShardIntegrityError";
  }
}

/**
 * Collect a shard and require that its de-duplicated count is within tolerance
 * of its `total_count`.
 *
 * GitHub Search's offset pagination can drift when many repositories share the
 * same sort key (identical star counts) while new repositories are being
 * indexed, so pages overlap and several repositories fall out of the window.
 * That is recoverable: we re-request the first page (the count may have changed)
 * and re-paginate, a bounded number of times. If it still does not settle, we
 * throw a ShardIntegrityError so the caller can fall back to a finer dimension.
 *
 * A short result set with *no* overlapping pages is different: it is the count
 * index over-reporting a document that the retrieval index does not serve.
 * Retrying cannot fix it (see `MAX_SHARD_DEFICIT`) — within tolerance it is
 * accepted, beyond tolerance it is still an error.
 */
async function collectShard(
  client: GitHubSearchClient,
  params: ShardParams,
  total: number,
  first: SearchResponse,
): Promise<PluginItem[]> {
  client.stats.shards += 1;
  let outcome = await measureShard(client, params, total, first);
  if (isShardAcceptable(outcome)) {
    return acceptShard(client, params, outcome);
  }

  for (let attempt = 1; attempt <= SHARD_RETRY_ATTEMPTS; attempt++) {
    client.log(
      `Shard ${shardLabel(params)}: ${outcome.unique}/${outcome.total} unique after pagination ` +
        `(${duplicateEntries(outcome)} duplicate page entries); ` +
        `retrying ${attempt}/${SHARD_RETRY_ATTEMPTS}.`,
    );
    // Re-request the first page too, since the index may have drifted.
    const refirst = await client.search({ ...params, page: 1 });
    outcome = await measureShard(client, params, refirst.total_count, refirst);
    if (isShardAcceptable(outcome)) {
      client.stats.recoveredShards += 1;
      return acceptShard(client, params, outcome);
    }
  }

  throw new ShardIntegrityError(
    `Integrity check failed for shard ${shardLabel(params)}: ` +
      `expected ${outcome.total} unique repos, got ${outcome.unique} ` +
      `(${duplicateEntries(outcome)} duplicate page entries, ` +
      `tolerance ${maxShardDeficit(outcome.total)}).`,
  );
}

export async function collectAllRepos(
  client: GitHubSearchClient,
  start: string,
  end: string,
): Promise<PluginItem[]> {
  const first = await client.search({ start, end, page: 1 });
  const total = first.total_count;
  client.log(`Shard ${start}..${end}: total_count=${total}`);

  if (total > MAX_RESULTS_PER_SHARD) {
    const split = splitDateRange({ start, end });
    if (split === null) {
      // A single day still exceeds the 1,000-result ceiling: fall back to a
      // stars-range second dimension. The first page is sorted by stars desc,
      // so its first item is the day's maximum star count.
      const maxStars = first.items.length > 0 ? first.items[0].stargazers_count : 0;
      client.log(
        `Shard ${start}..${end} is a single day with ${total} results; ` +
          `sharding by stars 0..${maxStars}.`,
      );
      return await collectByStarsRange(client, start, end, 0, maxStars);
    }
    const [left, right] = split;
    const leftItems = await collectAllRepos(client, left.start, left.end);
    const rightItems = await collectAllRepos(client, right.start, right.end);
    return [...leftItems, ...rightItems];
  }

  try {
    return await collectShard(client, { start, end }, total, first);
  } catch (error) {
    if (!(error instanceof ShardIntegrityError)) {
      throw error;
    }
    if (!claimReshardBudget(client)) {
      client.log(
        `Shard ${start}..${end}: re-shard budget exhausted; failing instead of ` +
          `amplifying the failure.`,
      );
      throw error;
    }
    // Pagination did not settle for this window. Re-shard it rather than fail
    // the whole sync: a narrower window is far less likely to overlap.
    const split = splitDateRange({ start, end });
    if (split !== null) {
      client.log(
        `Shard ${start}..${end}: pagination did not settle; re-sharding by date.`,
      );
      const [left, right] = split;
      const leftItems = await collectAllRepos(client, left.start, left.end);
      const rightItems = await collectAllRepos(client, right.start, right.end);
      return [...leftItems, ...rightItems];
    }
    // A single day cannot be split any further, so try the stars dimension.
    // Without a first page there is no star ceiling to split on, so give up.
    if (first.items.length === 0) {
      throw error;
    }
    const maxStars = first.items[0].stargazers_count;
    client.log(
      `Shard ${start}..${end}: pagination did not settle; sharding by stars 0..${maxStars}.`,
    );
    return await collectByStarsRange(client, start, end, 0, maxStars);
  }
}

/**
 * Recursively collect repositories within a single-day range by splitting the
 * stars dimension. Each closed `[min, max]` stars range is queried; ranges that
 * still exceed the ceiling are bisected until they fit.
 *
 * When the range collapses to a single star value but still needs more than one
 * page, `sort=stars` has no ordering power (every repository ties), so offset
 * pagination drifts under live indexing. That case is delegated to creation-time
 * sharding (a third, orthogonal dimension).
 */
export async function collectByStarsRange(
  client: GitHubSearchClient,
  start: string,
  end: string,
  minStars: number,
  maxStars: number,
): Promise<PluginItem[]> {
  const params: ShardParams = { start, end, stars: { min: minStars, max: maxStars } };
  const first = await client.search({ ...params, page: 1 });
  const total = first.total_count;
  client.log(`Shard ${shardLabel(params)}: total_count=${total}`);

  if (minStars === maxStars && total > PER_PAGE) {
    return await collectByCreatedRange(client, start, minStars, maxStars);
  }

  if (total > MAX_RESULTS_PER_SHARD) {
    const mid = Math.floor((minStars + maxStars) / 2);
    const leftItems = await collectByStarsRange(client, start, end, minStars, mid);
    const rightItems = await collectByStarsRange(client, start, end, mid + 1, maxStars);
    return [...leftItems, ...rightItems];
  }

  try {
    return await collectShard(client, params, total, first);
  } catch (error) {
    if (error instanceof ShardIntegrityError) {
      if (!claimReshardBudget(client)) {
        client.log(
          `Shard ${shardLabel(params)}: re-shard budget exhausted; failing instead ` +
            `of amplifying the failure.`,
        );
        throw error;
      }
      // Pagination still drifted after retries (many repositories share the same
      // star value). This range is within a single day, so fall back to
      // creation-time sharding to eliminate cross-page drift.
      client.log(
        `Shard ${shardLabel(params)}: pagination drifted; falling back to creation-time sharding.`,
      );
      return await collectByCreatedRange(client, start, minStars, maxStars);
    }
    throw error;
  }
}

function toUtcSec(iso: string): number {
  return Math.floor(Date.parse(iso) / 1000);
}

function fromUtcSec(sec: number): string {
  return `${new Date(sec * 1000).toISOString().slice(0, 19)}Z`;
}

/**
 * Recursively collect repositories within a single day and a single star value
 * by bisecting the creation timestamp (hour/minute/second). This avoids the
 * unstable offset pagination that occurs when every repository shares the same
 * star count. Shards are reduced to at most one page (<= PER_PAGE).
 */
async function collectByCreatedRange(
  client: GitHubSearchClient,
  day: string,
  minStars: number,
  maxStars: number,
): Promise<PluginItem[]> {
  const startSec = toUtcSec(`${day}T00:00:00Z`);
  const endSec = toUtcSec(`${day}T23:59:59Z`);
  return await collectByCreatedRangeSec(client, startSec, endSec, minStars, maxStars);
}

async function collectByCreatedRangeSec(
  client: GitHubSearchClient,
  startSec: number,
  endSec: number,
  minStars: number,
  maxStars: number,
): Promise<PluginItem[]> {
  const startIso = fromUtcSec(startSec);
  const endIso = fromUtcSec(endSec);
  const stars: StarsRange = { min: minStars, max: maxStars };
  const first = await client.search({ start: startIso, end: endIso, page: 1, stars });
  const total = first.total_count;
  client.log(`Shard ${startIso}..${endIso} stars:${minStars}..${maxStars}: total_count=${total}`);

  if (total > PER_PAGE) {
    if (startSec >= endSec) {
      throw new Error(
        `Single-second range ${startIso} with star value ${minStars} still exceeds ` +
          `${PER_PAGE} results; refusing to publish truncated data.`,
      );
    }
    const mid = Math.floor((startSec + endSec) / 2);
    const leftItems = await collectByCreatedRangeSec(client, startSec, mid, minStars, maxStars);
    const rightItems = await collectByCreatedRangeSec(client, mid + 1, endSec, minStars, maxStars);
    return [...leftItems, ...rightItems];
  }

  // A single page holds everything, so there is no cross-page drift; the only
  // possible gap is the count-index overshoot handled by `collectShard`.
  try {
    return await collectShard(
      client,
      { start: startIso, end: endIso, stars },
      total,
      first,
    );
  } catch (error) {
    // This is the deepest fallback dimension, so there is nothing left to try.
    // Surface it as a plain error to stop callers from re-sharding.
    if (error instanceof ShardIntegrityError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

async function rootTotalCount(
  client: GitHubSearchClient,
  start: string,
  end: string,
): Promise<number> {
  const response = await client.search({ start, end, page: 1 });
  return response.total_count;
}

// ---------------------------------------------------------------------------
// Orchestration: collect, merge, sort, validate.
// ---------------------------------------------------------------------------

export async function runSync(deps: SyncDeps): Promise<Snapshot> {
  const client = new GitHubSearchClient(deps);
  const endDate = utcDateString(deps.now());
  const startDate = MIN_CREATED_AT;

  deps.log?.(`Starting sync for ${TOPIC}; window ${startDate}..${endDate}`);

  const before = await rootTotalCount(client, startDate, endDate);
  deps.log?.(`Root total_count (before): ${before}`);

  const collected = await collectAllRepos(client, startDate, endDate);
  const deduped = dedupeById(collected);
  deps.log?.(`Collected ${deduped.length} unique repos (${collected.length} raw).`);
  deps.log?.(
    `Shards: ${client.stats.shards}; accepted count deficit: ` +
      `${client.stats.missingRepositories} repo(s) ` +
      `(largest ${client.stats.largestDeficit}); ` +
      `drift-recovered shards: ${client.stats.recoveredShards}; ` +
      `re-sharded shards: ${client.stats.reshardedShards}.`,
  );

  // 剔除仅蹭热度、缺乏实用价值的仓库（已归档 / fork / 无描述 / 无许可证 /
  // 合集榜单类营销描述），过滤后再排序与计算排行。
  const filtered = filterLowValueRepos(deduped);
  deps.log?.(
    `Filtered ${filtered.stats.removed}/${filtered.stats.total} low-value repos ` +
      `(reasons: ${JSON.stringify(filtered.stats.reasons)}).`,
  );

  const sorted = sortItems(filtered.kept);

  const after = await rootTotalCount(client, startDate, endDate);
  deps.log?.(`Root total_count (after): ${after}`);

  if (before !== after) {
    deps.log?.(
      `Note: root total_count changed during sync (${before} -> ${after}); ` +
        `publishing the collection-time snapshot of ${sorted.length} repos.`,
    );
  }

  // The published total_count reflects the repositories actually collected and
  // validated during this run (the "collection-time snapshot"). Every shard is
  // still integrity-checked; the only tolerated gap is GitHub's count index
  // over-reporting documents its retrieval index cannot serve, and its size is
  // published as `count_deficit` instead of being hidden.
  const snapshot: Snapshot = {
    meta: {
      schema_version: 1,
      topic: TOPIC,
      source: SOURCE,
      topic_url: TOPIC_URL,
      query: `topic:${TOPIC}`,
      fetched_at: deps.now().toISOString(),
      total_count: sorted.length,
      count_deficit: client.stats.missingRepositories,
      complete: false,
    },
    items: sorted,
  };

  const validation = validateSnapshot(snapshot);
  if (!validation.ok) {
    throw new Error(`Snapshot validation failed: ${validation.errors.join("; ")}`);
  }
  snapshot.meta.complete = true;
  return snapshot;
}

// ---------------------------------------------------------------------------
// Atomic, validated write of public/plugins.json.
// ---------------------------------------------------------------------------

export async function writeSnapshotAtomic(
  targetPath: string,
  snapshot: Snapshot,
): Promise<void> {
  const directory = path.dirname(targetPath);
  await fs.mkdir(directory, { recursive: true });
  const tempPath = path.join(
    directory,
    `.${path.basename(targetPath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    const json = `${JSON.stringify(snapshot, null, 2)}\n`;
    await fs.writeFile(tempPath, json, "utf8");

    const reread = await fs.readFile(tempPath, "utf8");
    const parsed = JSON.parse(reread) as Snapshot;
    const validation = validateSnapshot(parsed);
    if (!validation.ok || parsed.meta.complete !== true) {
      throw new Error(`Final validation failed: ${validation.errors.join("; ")}`);
    }
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Publication.
//
// This project is a static site hosted on Vercel. Vercel's build filesystem is
// read-only and its serverless functions are too short-lived for the recursive
// sharded sync, so the sync itself always runs in GitHub Actions (a long-running
// environment with `GITHUB_TOKEN`).
//
// This script only writes the refreshed `public/plugins.json`. Committing and
// pushing are left to `.github/workflows/sync.yml`, which rebuilds the commit on
// top of the current `main` right before pushing. Keeping git out of the sync
// step means a git hiccup can never discard an otherwise successful collection,
// and it removes the risk of a non-fast-forward rejection on the default branch.
// The push triggers the connected Vercel project to redeploy.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Entry point (guarded so tests can import pure functions without syncing).
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN ?? "";
  if (!token) {
    console.error("[sync] GITHUB_TOKEN is not set. Run: GITHUB_TOKEN=... npm run sync");
    process.exitCode = 1;
    return;
  }

  const startedAt = Date.now();
  const deps: SyncDeps = {
    fetchImpl: globalThis.fetch,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => new Date(),
    token,
    log: (message) => console.log(`[sync] ${message}`),
  };

  try {
    const snapshot = await runSync(deps);
    const outputPath = path.resolve(process.cwd(), "public", "plugins.json");
    await writeSnapshotAtomic(outputPath, snapshot);
    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[sync] Done: ${snapshot.items.length} repos in ${elapsedSec}s -> ${outputPath}`);
    // Committing and pushing is the workflow's job (see the Publication note).
  } catch (error) {
    console.error(`[sync] FAILED: ${safeMessage(error)}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1];
const isMain =
  invokedPath != null &&
  import.meta.url === pathToFileURL(path.resolve(invokedPath)).href;
if (isMain) {
  void main();
}
