import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CATEGORY,
  CATEGORIES,
  OTHER_CATEGORY,
  categorize,
  categoryOrder,
  groupByCategory,
} from "../src/categories";
import { translate } from "../src/i18n";
import type { PluginItem } from "../src/types";

function item(
  id: number,
  topics: string[],
  stars = 0,
  full_name = `owner/repo-${id}`,
): PluginItem {
  return {
    id,
    name: `repo-${id}`,
    full_name,
    owner: "owner",
    owner_avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    url: `https://github.com/${full_name}`,
    homepage: null,
    description: null,
    stars,
    forks: 0,
    open_issues: 0,
    language: null,
    license: null,
    topics,
    fork: false,
    archived: false,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
    pushed_at: "2020-01-01T00:00:00Z",
  };
}

test("categorize matches a representative topic", () => {
  assert.equal(categorize(item(1, ["dsh-plugin", "web-ui"])), "web-ui");
  assert.equal(categorize(item(2, ["dsh-plugin", "cli"])), "cli");
  assert.equal(categorize(item(3, ["dsh-plugin", "mcp-server"])), "mcp");
});

test("categorize is case-insensitive", () => {
  assert.equal(categorize(item(1, ["dsh-plugin", "Web-UI"])), "web-ui");
});

test("categorize falls back to other for unknown topics", () => {
  assert.equal(
    categorize(item(1, ["dsh-plugin", "deepseek-harness", "dsh"])),
    OTHER_CATEGORY,
  );
  assert.equal(categorize(item(2, ["dsh-plugin"])), OTHER_CATEGORY);
});

test("categorize respects priority: earlier categories win on multiple matches", () => {
  // "mcp" is listed before "agent", so a repo with both tags is "mcp".
  const mcpIndex = CATEGORIES.findIndex((c) => c.id === "mcp");
  const agentIndex = CATEGORIES.findIndex((c) => c.id === "agent");
  assert.ok(mcpIndex < agentIndex);
  assert.equal(categorize(item(1, ["dsh-plugin", "mcp", "ai-agent"])), "mcp");
});

test("groupByCategory preserves stars-desc order within each group", () => {
  const items = [
    item(1, ["dsh-plugin", "web-ui"], 300),
    item(2, ["dsh-plugin", "cli"], 500),
    item(3, ["dsh-plugin", "web-ui"], 200),
    item(4, ["dsh-plugin", "web-ui"], 400),
  ];
  const grouped = groupByCategory(items);
  const webUi = grouped.get("web-ui") ?? [];
  const cli = grouped.get("cli") ?? [];
  assert.deepEqual(webUi.map((i) => i.stars), [300, 200, 400]);
  assert.deepEqual(cli.map((i) => i.stars), [500]);
  // The order within the group follows the (already sorted) input order.
  assert.deepEqual(webUi.map((i) => i.id), [1, 3, 4]);
});

test("categoryOrder starts with all and ends with other", () => {
  const order = categoryOrder();
  assert.equal(order[0], ALL_CATEGORY);
  assert.equal(order[order.length - 1], OTHER_CATEGORY);
  for (const category of CATEGORIES) {
    assert.ok(order.includes(category.id));
  }
});

test("translate interpolates params and falls back to en", () => {
  assert.equal(translate("en", "pageOf", { current: 2, total: 10 }), "Page 2 of 10");
  assert.equal(translate("zh", "pageOf", { current: 2, total: 10 }), "第 2 页 / 共 10 页");
  assert.equal(translate("zh", "starsLabel", { count: 42 }), "42 颗星");
});
