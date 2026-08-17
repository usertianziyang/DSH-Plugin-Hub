import type { PluginItem } from "./types";
import { TOP_PLUGIN_LIMIT } from "./data/mockData";

export function topPluginsByStars(
  items: readonly PluginItem[],
  limit = TOP_PLUGIN_LIMIT,
): PluginItem[] {
  return items
    .map((item, sourceIndex) => ({ item, sourceIndex }))
    .sort((left, right) => {
      const starDifference = right.item.stars - left.item.stars;
      return starDifference !== 0 ? starDifference : left.sourceIndex - right.sourceIndex;
    })
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}
