import { test } from "node:test";
import assert from "node:assert/strict";
import {
  filterLowValueRepos,
  isLowValue,
  MIN_DESCRIPTION_LENGTH,
} from "../src/filter-plugins";
import type { PluginItem } from "../src/types";

function plugin(overrides: Partial<PluginItem> = {}): PluginItem {
  return {
    id: 1,
    name: "plugin-1",
    full_name: "owner/plugin-1",
    owner: "owner",
    owner_avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    url: "https://github.com/owner/plugin-1",
    homepage: null,
    description: "A useful plugin with a meaningful description.",
    stars: 10,
    forks: 0,
    open_issues: 0,
    language: "TypeScript",
    license: "MIT",
    topics: ["dsh-plugin"],
    fork: false,
    archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-08-17T00:00:00Z",
    pushed_at: "2026-08-17T00:00:00Z",
    ...overrides,
  };
}

test("keeps a well-formed repository", () => {
  assert.equal(isLowValue(plugin()), null);
});

test("removes archived repositories", () => {
  assert.equal(isLowValue(plugin({ archived: true })), "archived");
});

test("removes repositories without a description", () => {
  assert.equal(isLowValue(plugin({ description: null })), "no-description");
  assert.equal(isLowValue(plugin({ description: "   " })), "no-description");
});

test("removes repositories with a too-short description", () => {
  assert.equal(isLowValue(plugin({ description: "A tool." })), "short-description");
  const boundary = "a".repeat(MIN_DESCRIPTION_LENGTH);
  assert.equal(isLowValue(plugin({ description: boundary })), null);
});

test("removes repositories without a license", () => {
  assert.equal(isLowValue(plugin({ license: null })), "no-license");
});

test("removes clickbait collection-style repositories", () => {
  assert.equal(
    isLowValue(plugin({ description: "An awesome list of DSH plugins curated daily." })),
    "clickbait-description",
  );
  assert.equal(
    isLowValue(plugin({ description: "精选全网热门 DSH 插件合集，持续更新。" })),
    "clickbait-description",
  );
});

test("removes forked repositories that lack a description", () => {
  assert.equal(
    isLowValue(plugin({ fork: true, description: null })),
    "forked",
  );
});

test("filterLowValueRepos preserves order and reports stats", () => {
  const kept = plugin({ id: 1 });
  const archived = plugin({ id: 2, archived: true });
  const noDesc = plugin({ id: 3, description: null });
  const kept2 = plugin({ id: 4, stars: 5 });

  const result = filterLowValueRepos([kept, archived, noDesc, kept2]);

  assert.deepEqual(result.kept.map((item) => item.id), [1, 4]);
  assert.deepEqual(result.removed.map((item) => item.id), [2, 3]);
  assert.equal(result.stats.total, 4);
  assert.equal(result.stats.kept, 2);
  assert.equal(result.stats.removed, 2);
  assert.equal(result.stats.reasons.archived, 1);
  assert.equal(result.stats.reasons["no-description"], 1);
  assert.equal(result.stats.reasons["short-description"], 0);
});
