import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
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
 * Fetch every page of a shard and de-duplicate by repository id. The first
 * page is passed in (already requested) and is not re-requested here.
 */
async function fetchShardPages(
  client: GitHubSearchClient,
  params: ShardParams,
  total: number,
  first: SearchResponse,
): Promise<PluginItem[]> {
  const pages = Math.ceil(total / PER_PAGE);
  const items: PluginItem[] = first.items.map(mapRepository);
  for (let page = 2; page <= pages; page++) {
    const response = await client.search({ ...params, page });
    items.push(...response.items.map(mapRepository));
  }
  return dedupeById(items);
}

/**
 * Signals that a shard's de-duplicated count did not match its total_count after
 * pagination and bounded retries. Callers that have a finer orthogonal dimension
 * (e.g. creation time within a day) may recover by re-sharding instead of failing.
 */
class ShardIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShardIntegrityError";
  }
}

/**
 * Collect a shard and require that its de-duplicated count exactly matches its
 * total_count. GitHub Search's offset pagination can drift when many
 * repositories share the same sort key (e.g. identical star counts) while new
 * repositories are being indexed, producing cross-page duplicates or gaps. We
 * retry the whole shard a bounded number of times; if the count still does not
 * match, we throw a ShardIntegrityError so the caller can either fail or fall
 * back to a finer dimension.
 */
async function collectShard(
  client: GitHubSearchClient,
  params: ShardParams,
  total: number,
  first: SearchResponse,
): Promise<PluginItem[]> {
  let unique = await fetchShardPages(client, params, total, first);
  if (unique.length === total) {
    return unique;
  }

  for (let attempt = 1; attempt <= SHARD_RETRY_ATTEMPTS; attempt++) {
    client.log(
      `Shard ${shardLabel(params)}: ${unique.length}/${total} unique after pagination; ` +
        `retrying ${attempt}/${SHARD_RETRY_ATTEMPTS}.`,
    );
    // Re-request the first page too, since the index may have drifted.
    const refirst = await client.search({ ...params, page: 1 });
    const newTotal = refirst.total_count;
    unique = await fetchShardPages(client, params, newTotal, refirst);
    if (unique.length === newTotal) {
      return unique;
    }
  }

  throw new ShardIntegrityError(
    `Integrity check failed for shard ${shardLabel(params)}: ` +
      `expected ${total} unique repos, got ${unique.length}.`,
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

  return await collectShard(client, { start, end }, total, first);
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

  // A single page holds everything, so there is no cross-page drift.
  const items = first.items.map(mapRepository);
  const unique = dedupeById(items);
  if (unique.length !== total) {
    throw new Error(
      `Integrity check failed for shard ${startIso}..${endIso} stars:${minStars}..${maxStars}: ` +
        `expected ${total} unique repos, got ${unique.length}.`,
    );
  }
  return unique;
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
  const sorted = sortItems(deduped);
  deps.log?.(`Collected ${sorted.length} unique repos (${collected.length} raw).`);

  const after = await rootTotalCount(client, startDate, endDate);
  deps.log?.(`Root total_count (after): ${after}`);

  if (before !== after) {
    deps.log?.(
      `Note: root total_count changed during sync (${before} -> ${after}); ` +
        `publishing the collection-time snapshot of ${sorted.length} repos.`,
    );
  }

  // The published total_count reflects the repositories actually collected and
  // validated during this run (the "collection-time snapshot"). Each shard is
  // still strictly integrity-checked, so no truncated shard is ever published.
  const snapshot: Snapshot = {
    meta: {
      schema_version: 1,
      topic: TOPIC,
      source: SOURCE,
      topic_url: TOPIC_URL,
      query: `topic:${TOPIC}`,
      fetched_at: deps.now().toISOString(),
      total_count: sorted.length,
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
