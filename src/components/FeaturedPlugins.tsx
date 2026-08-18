import { useMemo, useState } from "react";
import { CategoryFilter } from "./CategoryFilter";
import {
  FEATURED_CATEGORIES,
  resolveFeaturedPlugins,
  type FeaturedCategory,
} from "../data/featuredPlugins";
import type { PluginItem } from "../types";
import type { CategoryOption, Translate } from "../ui-types";
import { FeaturedPluginCard } from "./FeaturedPluginCard";

export interface FeaturedPluginsProps {
  readonly items: readonly PluginItem[];
  readonly t: Translate;
}

const CATEGORY_LABEL_KEYS: Record<FeaturedCategory, Parameters<Translate>[0]> = {
  essential: "featuredCategoryEssential",
  interface: "featuredCategoryInterface",
  capability: "featuredCategoryCapability",
  insights: "featuredCategoryInsights",
  workflow: "featuredCategoryWorkflow",
  fun: "featuredCategoryFun",
};

const ALL_CATEGORY = "all" as const;
type FeaturedFilter = typeof ALL_CATEGORY | FeaturedCategory;

export function FeaturedPlugins({ items, t }: FeaturedPluginsProps) {
  const resolved = useMemo(() => resolveFeaturedPlugins(items), [items]);
  const categoryOptions = useMemo<readonly CategoryOption[]>(
    () => [
      {
        id: ALL_CATEGORY,
        label: t("featuredCategoryAll"),
        count: resolved.length,
      },
      ...FEATURED_CATEGORIES.map((category) => ({
        id: category,
        label: t(CATEGORY_LABEL_KEYS[category]),
        count: resolved.filter((plugin) => plugin.category === category).length,
      })),
    ],
    [resolved, t],
  );
  const [activeCategory, setActiveCategory] = useState<FeaturedFilter>(ALL_CATEGORY);
  const visiblePlugins = useMemo(
    () =>
      activeCategory === ALL_CATEGORY
        ? resolved
        : resolved.filter((plugin) => plugin.category === activeCategory),
    [activeCategory, resolved],
  );

  return (
    <section className="featured-plugins" aria-label={t("featuredTitle")}>
      <CategoryFilter
        options={categoryOptions}
        activeCategory={activeCategory}
        t={t}
        onChange={(category) => setActiveCategory(category as FeaturedFilter)}
        shellClassName="featured-category-filter-shell"
        ariaLabel={t("featuredCategoriesLabel")}
      />

      <section className="featured-category" aria-live="polite">
        <header className="featured-category-header">
          <h2>
            {activeCategory === ALL_CATEGORY
              ? t("featuredCategoryAll")
              : t(CATEGORY_LABEL_KEYS[activeCategory])}
          </h2>
          <span>{visiblePlugins.length}</span>
        </header>
        <ol className="plugin-list">
          {visiblePlugins.map((plugin) => (
            <li key={plugin.item.id}>
              <FeaturedPluginCard plugin={plugin} t={t} />
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
