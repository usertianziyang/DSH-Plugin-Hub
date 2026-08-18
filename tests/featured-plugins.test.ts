import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURED_PLUGINS,
  resolveFeaturedPlugins,
  type FeaturedPluginConfig,
} from "../src/data/featuredPlugins";
import type { PluginItem } from "../src/types";

function plugin(overrides: Partial<PluginItem> = {}): PluginItem {
  return {
    id: 1,
    name: "plugin",
    full_name: "owner/plugin",
    owner: "owner",
    owner_avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    url: "https://github.com/owner/plugin",
    homepage: null,
    description: "A useful plugin.",
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

function config(overrides: Partial<FeaturedPluginConfig> = {}): FeaturedPluginConfig {
  return {
    url: "https://github.com/owner/plugin",
    category: "essential",
    version: "1.0.0",
    installCommand: "dsh install plugin",
    ...overrides,
  };
}

test("defines 20 unique curated repositories with fixed categories", () => {
  assert.equal(FEATURED_PLUGINS.length, 20);
  assert.equal(new Set(FEATURED_PLUGINS.map((entry) => entry.url)).size, 20);
  assert.ok(FEATURED_PLUGINS.every((entry) => entry.category.length > 0));
});

test("matches every configured plugin by its GitHub URL", () => {
  const items = FEATURED_PLUGINS.map((cfg, index) =>
    plugin({ id: index + 1, url: cfg.url, name: `p-${index}` }),
  );
  const resolved = resolveFeaturedPlugins(items);

  assert.equal(resolved.length, FEATURED_PLUGINS.length);
  resolved.forEach((entry, index) => {
    assert.equal(entry.item.url, FEATURED_PLUGINS[index].url);
    assert.equal(entry.category, FEATURED_PLUGINS[index].category);
    assert.equal(entry.version, FEATURED_PLUGINS[index].version);
    assert.equal(entry.installCommand, FEATURED_PLUGINS[index].installCommand);
  });
});

test("preserves the order defined by the config list", () => {
  const configs = [
    config({ url: "https://github.com/a/a", installCommand: "dsh install a" }),
    config({ url: "https://github.com/b/b", installCommand: "dsh install b" }),
    config({ url: "https://github.com/c/c", installCommand: "dsh install c" }),
  ];
  const items = [
    plugin({ url: "https://github.com/c/c", name: "c" }),
    plugin({ url: "https://github.com/a/a", name: "a" }),
    plugin({ url: "https://github.com/b/b", name: "b" }),
  ];

  const resolved = resolveFeaturedPlugins(items, configs);
  assert.deepEqual(
    resolved.map((entry) => entry.item.name),
    ["a", "b", "c"],
  );
});

test("skips configs whose URL is absent from the index", () => {
  const configs = [
    config({ url: "https://github.com/missing/repo" }),
    config({ url: "https://github.com/owner/plugin" }),
  ];
  const items = [plugin({ url: "https://github.com/owner/plugin", name: "kept" })];

  const resolved = resolveFeaturedPlugins(items, configs);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].item.name, "kept");
});

test("applies the description override when provided", () => {
  const configs = [config({ description: "精炼的中文功能简介" })];
  const items = [plugin({ url: "https://github.com/owner/plugin", description: "原始英文描述" })];

  const resolved = resolveFeaturedPlugins(items, configs);
  assert.equal(resolved[0].item.description, "精炼的中文功能简介");
});

test("keeps the repository description when no override is provided", () => {
  const configs = [config({ description: undefined })];
  const items = [plugin({ url: "https://github.com/owner/plugin", description: "原始英文描述" })];

  const resolved = resolveFeaturedPlugins(items, configs);
  assert.equal(resolved[0].item.description, "原始英文描述");
});
