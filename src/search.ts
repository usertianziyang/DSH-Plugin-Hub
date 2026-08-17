import type { PluginItem } from "./types";

const normalize = (value: string): string =>
  value.normalize("NFKC").toLocaleLowerCase();

/** A repository plus its precomputed, normalized search text. */
export interface IndexedItem {
  item: PluginItem;
  searchText: string;
}

const SEARCH_FIELDS: Array<(item: PluginItem) => string | null> = [
  (item) => item.name,
  (item) => item.full_name,
  (item) => item.owner,
  (item) => item.description,
  (item) => item.language,
  (item) => item.license,
];

/** Build the normalized, searchable text for a repository once. */
export function buildSearchText(item: PluginItem): string {
  const parts: string[] = [];
  for (const read of SEARCH_FIELDS) {
    const value = read(item);
    if (typeof value === "string" && value.length > 0) {
      parts.push(value);
    }
  }
  if (Array.isArray(item.topics)) {
    for (const topic of item.topics) {
      if (typeof topic === "string" && topic.length > 0) {
        parts.push(topic);
      }
    }
  }
  return normalize(parts.join(" "));
}

/** Split a raw query into normalized, non-empty keywords (AND semantics). */
export function tokenize(query: string): string[] {
  return normalize(query).trim().split(/\s+/).filter((token) => token.length > 0);
}

/** Precompute search text for a whole dataset, preserving the original order. */
export function indexItems(items: PluginItem[]): IndexedItem[] {
  return items.map((item) => ({ item, searchText: buildSearchText(item) }));
}

/**
 * Filter indexed items by a query. Every keyword must be present in the
 * item's search text (AND). An empty query returns all items in order.
 */
export function filterIndexed(indexed: IndexedItem[], query: string): IndexedItem[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return indexed;
  }
  return indexed.filter((entry) =>
    tokens.every((token) => entry.searchText.includes(token)),
  );
}

/** Convenience: filter raw items (used by tests). Order is preserved. */
export function searchItems(items: PluginItem[], query: string): PluginItem[] {
  return filterIndexed(indexItems(items), query).map((entry) => entry.item);
}
