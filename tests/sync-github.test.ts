import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  addDays,
  collectAllRepos,
  collectByStarsRange,
  daysBetween,
  dedupeById,
  GitHubSearchClient,
  runSync,
  sortItems,
  splitDateRange,
  validateSnapshot,
  writeSnapshotAtomic,
  type GitHubRepo,
  type SearchResponse,
  type SyncDeps,
} from "../scripts/sync-github";
import type { PluginItem, Snapshot } from "../src/types";

const START = "2008-01-01";
const END = "2026-08-17";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRepo(id: number, overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner-${id}/repo-${id}`,
    owner: { login: `owner-${id}`, avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4` },
    html_url: `https://github.com/owner-${id}/repo-${id}`,
    homepage: null,
    description: `Description for repo ${id}.`,
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    language: "TypeScript",
    license: { spdx_id: "MIT" },
    topics: ["dsh-plugin"],
    fork: false,
    archived: false,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    pushed_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeItem(overrides: Partial<PluginItem> & { id: number }): PluginItem {
  return {
    name: `repo-${overrides.id}`,
    full_name: `owner/repo-${overrides.id}`,
    owner: "owner",
    owner_avatar_url: `https://avatars.githubusercontent.com/u/${overrides.id}?v=4`,
    url: `https://github.com/owner/repo-${overrides.id}`,
    homepage: null,
    description: null,
    stars: 0,
    forks: 0,
    open_issues: 0,
    language: null,
    license: null,
    topics: ["dsh-plugin"],
    fork: false,
    archived: false,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    pushed_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

function snapshotFromItems(items: PluginItem[]): Snapshot {
  return {
    meta: {
      schema_version: 1,
      topic: "dsh-plugin",
      source: "github-rest-search",
      topic_url: "https://github.com/topics/dsh-plugin",
      query: "topic:dsh-plugin",
      fetched_at: "2026-08-17T00:00:00.000Z",
      total_count: items.length,
      complete: true,
    },
    items,
  };
}

function searchBody(
  items: GitHubRepo[],
  totalCount: number,
  incompleteResults = false,
): SearchResponse {
  return { total_count: totalCount, incomplete_results: incompleteResults, items };
}

function parseRange(query: string): { start: string; end: string } {
  const match = /created:([\d-]+)\.\.([\d-]+)/.exec(query);
  if (!match) {
    throw new Error(`No created range in query: ${query}`);
  }
  return { start: match[1], end: match[2] };
}

function parseStars(query: string): { min: number; max: number } | null {
  const match = /stars:(\d+)\.\.(\d+)/.exec(query);
  if (!match) {
    return null;
  }
  return { min: Number(match[1]), max: Number(match[2]) };
}

function parseCreatedTime(query: string): { start: string; end: string } | null {
  const match = /created:(\d{4}-\d{2}-\d{2}T[\d:]+Z)\.\.(\d{4}-\d{2}-\d{2}T[\d:]+Z)/.exec(query);
  if (!match) {
    return null;
  }
  return { start: match[1], end: match[2] };
}

interface FakeResult {
  status?: number;
  headers?: Record<string, string>;
  body: unknown;
}

type Handler = (query: string, page: number) => FakeResult;

function makeClient(handler: Handler, now = new Date("2026-08-17T00:00:00Z")) {
  const calls: Array<{ query: string; page: number }> = [];
  const sleeps: number[] = [];
  const fetchImpl = async (input: RequestInfo | URL): Promise<Response> => {
    const url = input instanceof URL ? input : new URL(String(input));
    const query = url.searchParams.get("q") ?? "";
    const page = Number(url.searchParams.get("page") ?? "1");
    calls.push({ query, page });
    const result = handler(query, page);
    const status = result.status ?? 200;
    const headers = result.headers ?? {};
    return new Response(JSON.stringify(result.body), { status, headers });
  };
  const deps: SyncDeps = {
    fetchImpl,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: () => now,
    token: "test-token",
    log: () => {},
  };
  const client = new GitHubSearchClient(deps);
  return { client, deps, calls, sleeps };
}

// ---------------------------------------------------------------------------
// Date sharding
// ---------------------------------------------------------------------------

test("splitDateRange produces adjacent, non-overlapping, gap-free ranges", () => {
  const cases: Array<[string, string]> = [
    ["2020-01-01", "2020-01-10"],
    ["2020-01-01", "2020-01-02"],
    ["2020-02-28", "2020-03-02"],
    ["2008-01-01", "2026-08-17"],
  ];
  for (const [start, end] of cases) {
    const result = splitDateRange({ start, end });
    assert.ok(result, `expected split for ${start}..${end}`);
    const [left, right] = result!;
    assert.equal(left.start, start);
    assert.equal(right.end, end);
    assert.equal(addDays(left.end, 1), right.start, "ranges must be adjacent");
    const totalDays = daysBetween(start, end);
    const leftDays = daysBetween(left.start, left.end);
    const rightDays = daysBetween(right.start, right.end);
    assert.equal(leftDays + rightDays + 1, totalDays, "no overlap, no gap");
  }
  assert.equal(splitDateRange({ start: "2020-01-01", end: "2020-01-01" }), null);
});

test("total_count > 1000 recurses into sub-ranges", async () => {
  const split = splitDateRange({ start: START, end: END })!;
  const left = split[0];
  const right = split[1];

  const { client } = makeClient((query) => {
    const range = parseRange(query);
    if (range.start === START && range.end === END) {
      return { body: searchBody([], 1001) };
    }
    if (range.start === left.start && range.end === left.end) {
      return { body: searchBody([makeRepo(1), makeRepo(2)], 2) };
    }
    if (range.start === right.start && range.end === right.end) {
      return { body: searchBody([makeRepo(3)], 1) };
    }
    throw new Error(`unexpected query ${query}`);
  });

  const items = await collectAllRepos(client, START, END);
  assert.deepEqual(
    items.map((i) => i.id).sort((a, b) => a - b),
    [1, 2, 3],
  );
});

test("total_count <= 1000 paginates all pages and reuses the first page", async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => makeRepo(i + 1));
  const page2 = Array.from({ length: 100 }, (_, i) => makeRepo(i + 101));
  const page3 = Array.from({ length: 50 }, (_, i) => makeRepo(i + 201));

  const { client, calls } = makeClient((_query, page) => {
    if (page === 1) return { body: searchBody(page1, 250) };
    if (page === 2) return { body: searchBody(page2, 250) };
    if (page === 3) return { body: searchBody(page3, 250) };
    throw new Error(`unexpected page ${page}`);
  });

  const items = await collectAllRepos(client, START, END);
  assert.equal(items.length, 250);
  assert.deepEqual(calls.map((c) => c.page), [1, 2, 3]);
});

test("zero-result shard makes no extra pagination requests", async () => {
  const { client, calls } = makeClient(() => ({ body: searchBody([], 0) }));
  const items = await collectAllRepos(client, START, END);
  assert.equal(items.length, 0);
  assert.equal(calls.length, 1);
});

test("single star value still over the page size in a single second fails", async () => {
  const { client } = makeClient(() => ({ body: searchBody([], 1001) }));
  await assert.rejects(
    () => collectAllRepos(client, "2026-08-17", "2026-08-17"),
    /Single-second range/,
  );
});

test("single star value over 100 is sharded by creation time into single-page shards", async () => {
  const DAY = "2026-08-15";
  const low = Array.from({ length: 80 }, (_, i) => makeRepo(i + 1, { stargazers_count: 0 }));
  const high = Array.from({ length: 70 }, (_, i) => makeRepo(i + 1000, { stargazers_count: 0 }));

  const { client } = makeClient((query) => {
    const created = parseCreatedTime(query);
    if (created === null) {
      // The initial day-granularity query reports 150 (> 100), which triggers
      // creation-time sharding.
      return { body: searchBody([], 150) };
    }
    const isFullDay =
      created.start === `${DAY}T00:00:00Z` && created.end === `${DAY}T23:59:59Z`;
    if (isFullDay) {
      return { body: searchBody([], 150) };
    }
    const startHour = Number(created.start.slice(11, 13));
    if (startHour < 12) {
      return { body: searchBody(low, 80) };
    }
    return { body: searchBody(high, 70) };
  });

  const items = await collectByStarsRange(client, DAY, DAY, 0, 0);
  assert.equal(items.length, 150);
});

test("stars shard pagination drift falls back to creation-time sharding", async () => {
  const DAY = "2026-08-15";
  const morning = Array.from({ length: 80 }, (_, i) => makeRepo(i + 1, { stargazers_count: 0 }));
  const afternoon = Array.from({ length: 70 }, (_, i) => makeRepo(i + 1000, { stargazers_count: 0 }));

  const { client } = makeClient((query) => {
    const created = parseCreatedTime(query);
    if (created === null) {
      // Day-granularity stars shard always drifts (duplicate ids), forcing a
      // fallback to creation-time sharding after pagination retries.
      return { body: searchBody([makeRepo(1), makeRepo(1), makeRepo(2)], 150) };
    }
    const isFullDay =
      created.start === `${DAY}T00:00:00Z` && created.end === `${DAY}T23:59:59Z`;
    if (isFullDay) {
      return { body: searchBody([], 150) };
    }
    const startHour = Number(created.start.slice(11, 13));
    if (startHour < 12) {
      return { body: searchBody(morning, 80) };
    }
    return { body: searchBody(afternoon, 70) };
  });

  const items = await collectByStarsRange(client, DAY, DAY, 0, 1);
  assert.equal(items.length, 150);
});

test("single-day over 1000 is sharded by stars range into sub-1000 shards", async () => {
  const DAY = "2026-08-14";
  const topRepo = makeRepo(1, { stargazers_count: 100 });
  const low = Array.from({ length: 800 }, (_, i) => makeRepo(i + 100, { stargazers_count: 40 }));
  const high = Array.from({ length: 700 }, (_, i) => makeRepo(i + 1000, { stargazers_count: 80 }));

  const { client, calls } = makeClient((query, page) => {
    const stars = parseStars(query);
    if (stars === null) {
      // The initial (date-only) query reports 1500 and yields maxStars=100.
      return { body: searchBody([topRepo], 1500) };
    }
    if (stars.min === 0 && stars.max === 100) {
      return { body: searchBody([], 1500) };
    }
    if (stars.min === 0 && stars.max === 50) {
      const startIdx = (page - 1) * 100;
      return { body: searchBody(low.slice(startIdx, startIdx + 100), 800) };
    }
    if (stars.min === 51 && stars.max === 100) {
      const startIdx = (page - 1) * 100;
      return { body: searchBody(high.slice(startIdx, startIdx + 100), 700) };
    }
    throw new Error(`unexpected query ${query}`);
  });

  const items = await collectAllRepos(client, DAY, DAY);
  assert.equal(items.length, 1500);
  // Verify the stars shards were actually queried.
  assert.ok(calls.some((c) => parseStars(c.query)?.min === 0 && parseStars(c.query)?.max === 50));
  assert.ok(calls.some((c) => parseStars(c.query)?.min === 51 && parseStars(c.query)?.max === 100));
});

// ---------------------------------------------------------------------------
// incomplete_results handling
// ---------------------------------------------------------------------------

test("incomplete_results retries then succeeds", async () => {
  let count = 0;
  const { client } = makeClient(() => {
    count += 1;
    return { body: searchBody([makeRepo(1)], 1, count < 3) };
  });
  const items = await collectAllRepos(client, START, END);
  assert.equal(items.length, 1);
  assert.equal(count, 3);
});

test("persistent incomplete_results fails", async () => {
  const { client } = makeClient(() => ({ body: searchBody([makeRepo(1)], 1, true) }));
  await assert.rejects(
    () => collectAllRepos(client, START, END),
    /incomplete_results/,
  );
});

// ---------------------------------------------------------------------------
// Integrity
// ---------------------------------------------------------------------------

test("shard integrity fails when unique count != total_count", async () => {
  const { client } = makeClient(() => ({
    body: searchBody([makeRepo(1), makeRepo(1), makeRepo(2)], 3),
  }));
  await assert.rejects(
    () => collectAllRepos(client, START, END),
    /Integrity check failed/,
  );
});

test("shard pagination drift retries and succeeds on a stable re-fetch", async () => {
  let call = 0;
  const { client } = makeClient(() => {
    call += 1;
    // First fetch drifts (duplicate id), retry returns clean unique data.
    if (call === 1) {
      return { body: searchBody([makeRepo(1), makeRepo(1), makeRepo(2)], 3) };
    }
    return { body: searchBody([makeRepo(1), makeRepo(2), makeRepo(3)], 3) };
  });
  const items = await collectAllRepos(client, START, END);
  assert.deepEqual(
    items.map((i) => i.id).sort((a, b) => a - b),
    [1, 2, 3],
  );
});

test("cross-shard duplicate ids are deduped across the merged result", async () => {
  const [left, right] = splitDateRange({ start: START, end: END })!;
  const leftRepos = Array.from({ length: 600 }, (_, i) => makeRepo(i + 1));
  // id 600 appears in both the left (600 repos) and right shards, simulating a
  // cross-shard duplicate.
  const rightRepos = [
    makeRepo(600),
    ...Array.from({ length: 400 }, (_, i) => makeRepo(i + 601)),
  ];

  const { deps } = makeClient((query, page) => {
    const range = parseRange(query);
    if (range.start === START && range.end === END) {
      return { body: searchBody([], 1001) };
    }
    if (range.start === left.start && range.end === left.end) {
      const startIdx = (page - 1) * 100;
      return { body: searchBody(leftRepos.slice(startIdx, startIdx + 100), 600) };
    }
    if (range.start === right.start && range.end === right.end) {
      const startIdx = (page - 1) * 100;
      return { body: searchBody(rightRepos.slice(startIdx, startIdx + 100), 401) };
    }
    throw new Error(`unexpected query ${query}`);
  });

  const snapshot = await runSync(deps);
  // 600 + 401 raw repos collapse to 1000 unique ids after global dedup.
  assert.equal(snapshot.items.length, 1000);
  assert.equal(snapshot.meta.total_count, 1000);
  assert.equal(snapshot.meta.complete, true);
  // id 600 must appear exactly once despite appearing in both shards.
  assert.equal(snapshot.items.filter((item) => item.id === 600).length, 1);
});

test("dedupeById keeps the first occurrence for each id", () => {
  const result = dedupeById([
    makeItem({ id: 1, stars: 1 }),
    makeItem({ id: 1, stars: 100 }),
    makeItem({ id: 2, stars: 5 }),
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 1);
  assert.equal(result[0].stars, 1);
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

test("sortItems orders by stars desc then full_name asc", () => {
  const items = [
    makeItem({ id: 1, full_name: "b/repo", stars: 5 }),
    makeItem({ id: 2, full_name: "a/repo", stars: 10 }),
    makeItem({ id: 3, full_name: "c/repo", stars: 5 }),
  ];
  assert.deepEqual(sortItems(items).map((i) => i.id), [2, 1, 3]);
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test("validateSnapshot rejects invalid data", () => {
  assert.equal(validateSnapshot(snapshotFromItems([makeItem({ id: 1, topics: ["other"] })])).ok, false);
  assert.equal(validateSnapshot(snapshotFromItems([makeItem({ id: 1, stars: -1 })])).ok, false);
  assert.equal(
    validateSnapshot(snapshotFromItems([makeItem({ id: 1 }), makeItem({ id: 1 })])).ok,
    false,
  );

  const wrongUrl = snapshotFromItems([]);
  wrongUrl.meta.topic_url = "https://example.com";
  assert.equal(validateSnapshot(wrongUrl).ok, false);

  const mismatch = snapshotFromItems([makeItem({ id: 1 })]);
  mismatch.meta.total_count = 5;
  assert.equal(validateSnapshot(mismatch).ok, false);

  const unsorted = snapshotFromItems([
    makeItem({ id: 1, full_name: "a/repo", stars: 1 }),
    makeItem({ id: 2, full_name: "b/repo", stars: 10 }),
  ]);
  assert.equal(validateSnapshot(unsorted).ok, false);

  const valid = snapshotFromItems([
    makeItem({ id: 2, full_name: "a/repo", stars: 10 }),
    makeItem({ id: 1, full_name: "b/repo", stars: 5 }),
  ]);
  assert.equal(validateSnapshot(valid).ok, true);
});

// ---------------------------------------------------------------------------
// Atomic write
// ---------------------------------------------------------------------------

test("writeSnapshotAtomic preserves old file on validation failure", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dsh-sync-"));
  try {
    const target = path.join(dir, "plugins.json");
    await fs.writeFile(target, "OLD_SNAPSHOT", "utf8");

    const invalid = snapshotFromItems([]);
    invalid.meta.total_count = 3;

    await assert.rejects(() => writeSnapshotAtomic(target, invalid));
    assert.equal(await fs.readFile(target, "utf8"), "OLD_SNAPSHOT");

    const files = await fs.readdir(dir);
    assert.deepEqual(files, ["plugins.json"]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("writeSnapshotAtomic publishes a valid snapshot", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dsh-sync-"));
  try {
    const target = path.join(dir, "plugins.json");
    const valid = snapshotFromItems([
      makeItem({ id: 2, full_name: "a/repo", stars: 10 }),
      makeItem({ id: 1, full_name: "b/repo", stars: 5 }),
    ]);
    await writeSnapshotAtomic(target, valid);
    const parsed = JSON.parse(await fs.readFile(target, "utf8")) as Snapshot;
    assert.equal(parsed.meta.complete, true);
    assert.equal(parsed.items.length, 2);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Retry / rate limit / server errors
// ---------------------------------------------------------------------------

test("429 respects Retry-After and retries", async () => {
  let count = 0;
  const { client, sleeps } = makeClient(() => {
    count += 1;
    if (count === 1) {
      return { status: 429, headers: { "retry-after": "1" }, body: {} };
    }
    return { body: searchBody([makeRepo(1)], 1) };
  });
  const items = await collectAllRepos(client, START, END);
  assert.equal(items.length, 1);
  assert.ok(sleeps.some((ms) => ms === 2000));
});

test("rate-limited 403 respects x-ratelimit-reset", async () => {
  const now = new Date("2026-08-17T00:00:00Z");
  let count = 0;
  const { client, sleeps } = makeClient(() => {
    count += 1;
    if (count === 1) {
      return {
        status: 403,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(now.getTime() / 1000) + 60),
        },
        body: {},
      };
    }
    return { body: searchBody([makeRepo(1)], 1) };
  }, now);
  const items = await collectAllRepos(client, START, END);
  assert.equal(items.length, 1);
  assert.ok(sleeps.some((ms) => ms >= 60_000));
});

test("5xx retries with backoff", async () => {
  let count = 0;
  const { client, sleeps } = makeClient(() => {
    count += 1;
    if (count === 1) return { status: 500, body: {} };
    return { body: searchBody([makeRepo(1)], 1) };
  });
  const items = await collectAllRepos(client, START, END);
  assert.equal(items.length, 1);
  assert.ok(sleeps.some((ms) => ms === 2000));
});

test("runSync publishes the collection-time snapshot even when before/after counts differ", async () => {
  const state = { rootCalls: 0 };
  const { deps } = makeClient((query) => {
    const range = parseRange(query);
    if (range.start === START && range.end === END) {
      state.rootCalls += 1;
      // before = 2, after = 3 (grew during sync), but the collected repos are
      // the 3 actually returned by the shard query.
      const total = state.rootCalls === 1 ? 2 : 3;
      const items = Array.from({ length: total }, (_, i) => makeRepo(i + 1));
      return { body: searchBody(items, total) };
    }
    throw new Error(`unexpected query ${query}`);
  });

  const snapshot = await runSync(deps);
  // The published snapshot reflects what was collected, not the changing root.
  assert.equal(snapshot.meta.complete, true);
  assert.equal(snapshot.meta.total_count, snapshot.items.length);
});
