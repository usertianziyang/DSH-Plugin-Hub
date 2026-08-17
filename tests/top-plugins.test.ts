import assert from "node:assert/strict";
import { test } from "node:test";
import { categorize } from "../src/categories";
import { filterIndexed, indexItems } from "../src/search";
import { topPluginsByStars } from "../src/top-plugins";
import type { PluginItem } from "../src/types";

function plugin(
  id: number,
  stars: number,
  overrides: Partial<PluginItem> = {},
): PluginItem {
  return {
    id,
    name: `plugin-${id}`,
    full_name: `owner/plugin-${id}`,
    owner: "owner",
    owner_avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
    url: `https://github.com/owner/plugin-${id}`,
    homepage: null,
    description: null,
    stars,
    forks: 0,
    open_issues: 0,
    language: null,
    license: null,
    topics: ["dsh-plugin"],
    fork: false,
    archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-08-17T00:00:00Z",
    pushed_at: "2026-08-17T00:00:00Z",
    ...overrides,
  };
}

test("selects only the ten most-starred repositories in descending order", () => {
  const items = [
    plugin(1, 4),
    plugin(2, 12),
    plugin(3, 8),
    plugin(4, 11),
    plugin(5, 1),
    plugin(6, 9),
    plugin(7, 6),
    plugin(8, 2),
    plugin(9, 10),
    plugin(10, 7),
    plugin(11, 5),
    plugin(12, 3),
  ];

  const result = topPluginsByStars(items);

  assert.equal(result.length, 10);
  assert.deepEqual(result.map(({ stars }) => stars), [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
  assert.equal(result[0]?.id, 2);
  assert.ok(!result.some(({ id }) => id === 5 || id === 8));
});

test("preserves source order when repositories have equal star counts", () => {
  const result = topPluginsByStars([
    plugin(21, 100),
    plugin(22, 100),
    plugin(23, 100),
  ]);

  assert.deepEqual(result.map(({ id }) => id), [21, 22, 23]);
});

test("search and category filtering can use the full repository index", () => {
  const excludedSearchMatch = plugin(1, 1, {
    name: "excluded-search-match",
    description: "unique-outside-top-ten",
    topics: ["dsh-plugin", "ui"],
  });
  const excludedCategoryMatch = plugin(2, 2, {
    topics: ["dsh-plugin", "ui", "frontend"],
  });
  const topTen = Array.from({ length: 10 }, (_, index) =>
    plugin(index + 10, 100 - index, {
      description: index === 0 ? "included-search-match" : null,
      topics: ["dsh-plugin", "cli"],
    }),
  );

  const items = [
    excludedSearchMatch,
    ...topTen.slice(0, 5),
    excludedCategoryMatch,
    ...topTen.slice(5),
  ];
  const allRanked = topPluginsByStars(items, items.length);
  const homeRanking = allRanked.slice(0, 10);
  const searchResults = filterIndexed(
    indexItems(allRanked),
    "unique-outside-top-ten",
  );
  const categories = allRanked.map((item) => categorize(item));

  assert.equal(homeRanking.length, 10);
  assert.ok(!homeRanking.some(({ id }) => id === excludedCategoryMatch.id));
  assert.deepEqual(searchResults.map(({ item }) => item.id), [excludedSearchMatch.id]);
  assert.ok(categories.includes("web-ui"));
});
