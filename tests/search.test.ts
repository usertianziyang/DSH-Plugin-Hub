import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchText,
  filterIndexed,
  indexItems,
  searchItems,
  tokenize,
} from "../src/search";
import type { PluginItem } from "../src/types";

function item(overrides: Partial<PluginItem> & { id: number }): PluginItem {
  return {
    name: "repo",
    full_name: "owner/repo",
    owner: "owner",
    owner_avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    url: "https://github.com/owner/repo",
    homepage: null,
    description: null,
    stars: 0,
    forks: 0,
    open_issues: 0,
    language: null,
    license: null,
    topics: [],
    fork: false,
    archived: false,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    pushed_at: "2020-01-01T00:00:00Z",
    ...overrides,
  };
}

test("search is case-insensitive and NFKC-normalized", () => {
  const items = [
    item({ id: 1, name: "React" }),
    item({ id: 2, name: "ＴｙｐｅＳｃｒｉｐｔ" }),
  ];
  assert.deepEqual(searchItems(items, "react").map((i) => i.id), [1]);
  assert.deepEqual(searchItems(items, "TYPESCRIPT").map((i) => i.id), [2]);
});

test("multiple keywords use AND semantics", () => {
  const items = [
    item({ id: 1, name: "react", description: "typescript" }),
    item({ id: 2, name: "react", description: "python" }),
    item({ id: 3, name: "vue", description: "typescript" }),
  ];
  assert.deepEqual(searchItems(items, "react typescript").map((i) => i.id), [1]);
});

test("empty search returns all items in order", () => {
  const items = [
    item({ id: 3, name: "c" }),
    item({ id: 1, name: "a" }),
    item({ id: 2, name: "b" }),
  ];
  assert.deepEqual(searchItems(items, "   ").map((i) => i.id), [3, 1, 2]);
});

test("searchable fields include topics, language, license, and owner", () => {
  const items = [
    item({ id: 1, topics: ["dsh-plugin", "cli"] }),
    item({ id: 2, language: "Rust" }),
    item({ id: 3, license: "Apache-2.0" }),
    item({ id: 4, owner: "acme-corp" }),
  ];
  assert.deepEqual(searchItems(items, "cli").map((i) => i.id), [1]);
  assert.deepEqual(searchItems(items, "rust").map((i) => i.id), [2]);
  assert.deepEqual(searchItems(items, "apache").map((i) => i.id), [3]);
  assert.deepEqual(searchItems(items, "acme").map((i) => i.id), [4]);
});

test("tokenize splits on whitespace and normalizes", () => {
  assert.deepEqual(tokenize("  React   TypeScript  "), ["react", "typescript"]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("ＡＢＣ"), ["abc"]);
});

test("buildSearchText joins all searchable fields", () => {
  const text = buildSearchText(
    item({
      id: 1,
      name: "MyPlugin",
      full_name: "acme/my-plugin",
      description: "A helper",
      language: "Go",
      license: "MIT",
      topics: ["dsh-plugin", "tooling"],
    }),
  );
  for (const expected of ["myplugin", "acme/my-plugin", "a helper", "go", "mit", "tooling"]) {
    assert.ok(text.includes(expected), `expected search text to include "${expected}"`);
  }
});

test("indexItems preserves order and filterIndexed keeps it", () => {
  const items = [item({ id: 3 }), item({ id: 1 }), item({ id: 2 })];
  const indexed = indexItems(items);
  assert.deepEqual(indexed.map((e) => e.item.id), [3, 1, 2]);
  assert.deepEqual(filterIndexed(indexed, "").map((e) => e.item.id), [3, 1, 2]);
});
