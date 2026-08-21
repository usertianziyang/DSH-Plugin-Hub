import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALL_CATEGORY,
  ALL_LABEL,
  CATEGORIES,
  OTHER_CATEGORY,
  OTHER_LABEL,
  categorize,
  categoryOrder,
} from "../categories";
import { TOP_PLUGIN_LIMIT } from "../data/mockData";
import { detectLang, persistLang, translate, type Lang } from "../i18n";
import { filterIndexed, indexItems } from "../search";
import { topPluginsByStars } from "../top-plugins";
import type { Snapshot } from "../types";
import type { CategoryOption, RankedIndexedItem, Translate } from "../ui-types";

const dataUrl = `${import.meta.env?.BASE_URL ?? "/"}plugins.json`;

export type AsyncState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly snapshot: Snapshot }
  | { readonly status: "error"; readonly message: string };

export type ExplorerSection = "top" | "explore" | "featured" | "guide";
export type ExplorerViewMode = ExplorerSection | "category" | "search";

interface UrlState {
  readonly query: string;
  readonly category: string;
  readonly section: ExplorerSection;
}

export interface PluginExplorerState {
  readonly state: AsyncState;
  readonly snapshot: Snapshot | null;
  readonly lang: Lang;
  readonly t: Translate;
  readonly query: string;
  readonly searchDraft: string;
  readonly category: string;
  readonly categoryOptions: readonly CategoryOption[];
  readonly filteredItems: readonly RankedIndexedItem[];
  readonly searchDraftResults: readonly RankedIndexedItem[];
  readonly section: ExplorerSection;
  readonly viewMode: ExplorerViewMode;
  readonly activeCategoryLabel: string;
  readonly topCount: number;
  readonly totalCount: number;
  readonly limit: number;
  readonly searchOpen: boolean;
  readonly inlineSearchOpen: boolean;
  readonly setSearchDraft: (value: string) => void;
  readonly applySearch: () => void;
  readonly clearSearch: () => void;
  readonly setCategory: (value: string) => void;
  readonly setSection: (value: ExplorerSection) => void;
  readonly toggleLanguage: () => void;
  readonly openSearch: () => void;
  readonly closeSearch: () => void;
}

function readUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  const requestedCategory = params.get("cat") ?? ALL_CATEGORY;
  const category = categoryOrder().includes(requestedCategory)
    ? requestedCategory
    : ALL_CATEGORY;
  const viewParam = params.get("view");
  const section: ExplorerSection =
    viewParam === "explore"
      ? "explore"
      : viewParam === "featured"
        ? "featured"
        : viewParam === "guide"
            ? "guide"
            : "top";
  return { query: params.get("q") ?? "", category, section };
}

function categoryLabel(id: string, lang: Lang): string {
  if (id === ALL_CATEGORY) return ALL_LABEL[lang];
  if (id === OTHER_CATEGORY) return OTHER_LABEL[lang];
  return CATEGORIES.find((category) => category.id === id)?.label[lang] ?? id;
}

export function usePluginExplorer(): PluginExplorerState {
  const initialUrlState = useMemo(readUrlState, []);
  const [state, setState] = useState<AsyncState>({ status: "idle" });
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const [query, setQueryState] = useState(initialUrlState.query);
  const [searchDraft, setSearchDraftState] = useState(initialUrlState.query);
  const [category, setCategoryState] = useState(initialUrlState.category);
  const [section, setSectionState] = useState<ExplorerSection>(
    initialUrlState.section,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [inlineSearchOpen, setInlineSearchOpen] = useState(false);

  const t = useMemo<Translate>(
    () => (key, params) => translate(lang, key, params),
    [lang],
  );

  useEffect(() => {
    document.title =
      lang === "zh"
        ? "DSH Plugin Hub — Stars Top 10"
        : "DSH Plugin Hub — Top 10 by Stars";
  }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(dataUrl, { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load plugin index (HTTP ${response.status}).`);
        }
        return response.json() as Promise<Snapshot>;
      })
      .then((snapshot) => {
        if (!controller.signal.aborted) {
          setState({ status: "success", snapshot });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
  }, []);

  const snapshot = state.status === "success" ? state.snapshot : null;
  const allItems = useMemo(
    () =>
      topPluginsByStars(
        snapshot?.items ?? [],
        snapshot?.items.length ?? 0,
      ),
    [snapshot],
  );
  const topItems = useMemo(
    () => allItems.slice(0, TOP_PLUGIN_LIMIT),
    [allItems],
  );
  const allIndexed = useMemo<RankedIndexedItem[]>(
    () =>
      indexItems(allItems).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
    [allItems],
  );
  const topIndexed = useMemo(
    () => allIndexed.slice(0, TOP_PLUGIN_LIMIT),
    [allIndexed],
  );
  const categorized = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of allItems) map.set(item.id, categorize(item));
    return map;
  }, [allItems]);
  const searchScopeItems = useMemo(
    () =>
      category === ALL_CATEGORY
        ? allIndexed
        : allIndexed.filter(
            (entry) => categorized.get(entry.item.id) === category,
          ),
    [allIndexed, categorized, category],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>([[ALL_CATEGORY, allItems.length]]);
    for (const id of categorized.values()) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [allItems.length, categorized]);
  const categoryOptions = useMemo(
    () =>
      categoryOrder()
        .map((id) => ({
          id,
          label: categoryLabel(id, lang),
          count: categoryCounts.get(id) ?? 0,
        })),
    [categoryCounts, lang],
  );
  const hasQuery = query.trim().length > 0;
  const viewMode: ExplorerViewMode =
    section === "featured"
      ? "featured"
      : section === "guide"
          ? "guide"
          : hasQuery
        ? "search"
        : section === "top"
          ? "top"
          : category === ALL_CATEGORY
            ? "explore"
            : "category";
  const scopedItems = useMemo(() => {
    if (section === "featured" || section === "guide") return [];
    if (hasQuery) {
      return searchScopeItems;
    }
    if (section === "top") return topIndexed;
    if (category !== ALL_CATEGORY) {
      return allIndexed.filter(
        (entry) => categorized.get(entry.item.id) === category,
      );
    }
    return allIndexed;
  }, [allIndexed, categorized, category, hasQuery, searchScopeItems, section, topIndexed]);
  const filteredItems = useMemo(
    () => filterIndexed(scopedItems, query),
    [query, scopedItems],
  );
  const searchDraftResults = useMemo(
    () => filterIndexed(searchScopeItems, searchDraft),
    [searchDraft, searchScopeItems],
  );
  const activeCategoryLabel = useMemo(
    () => categoryLabel(category, lang),
    [category, lang],
  );

  useEffect(() => {
    if (!categoryOptions.some((option) => option.id === category)) {
      setCategoryState(ALL_CATEGORY);
    }
  }, [category, categoryOptions]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== ALL_CATEGORY) params.set("cat", category);
    if (section === "explore") params.set("view", "explore");
    if (section === "featured") params.set("view", "featured");
      if (section === "guide") params.set("view", "guide");
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [category, query, section]);

  const setSearchDraft = useCallback((value: string) => {
    setSearchDraftState(value);
  }, []);
  const applySearch = useCallback(() => {
    const nextQuery = searchDraft.trim();
    setSectionState("explore");
    setQueryState(nextQuery);
    setSearchOpen(false);
    setInlineSearchOpen(nextQuery.length === 0);
  }, [searchDraft]);
  const clearSearch = useCallback(() => {
    setSectionState("explore");
    setQueryState("");
    setSearchDraftState("");
    setInlineSearchOpen(true);
  }, []);
  const setCategory = useCallback((value: string) => {
    setSectionState("explore");
    setCategoryState(value);
  }, []);
  const setSection = useCallback((value: ExplorerSection) => {
    setSectionState(value);
    setCategoryState(ALL_CATEGORY);
    setQueryState("");
    setSearchDraftState("");
    setInlineSearchOpen(false);
    if (value === "explore" || value === "featured" || value === "guide") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }, []);
  const toggleLanguage = useCallback(() => {
    const next = lang === "en" ? "zh" : "en";
    setLang(next);
    persistLang(next);
  }, [lang]);
  const openSearch = useCallback(() => {
    setSearchDraftState(query);
    setSearchOpen(true);
  }, [query]);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return {
    state,
    snapshot,
    lang,
    t,
    query,
    searchDraft,
    category,
    categoryOptions,
    filteredItems,
    searchDraftResults,
    section,
    viewMode,
    activeCategoryLabel,
    topCount: topItems.length,
    totalCount: allItems.length,
    limit: TOP_PLUGIN_LIMIT,
    searchOpen,
    inlineSearchOpen,
    setSearchDraft,
    applySearch,
    clearSearch,
    setCategory,
    setSection,
    toggleLanguage,
    openSearch,
    closeSearch,
  };
}
