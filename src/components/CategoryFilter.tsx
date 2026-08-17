import type { CategoryOption, Translate } from "../ui-types";
import { useCategoryOverflow } from "../hooks/useCategoryOverflow";

export interface CategoryFilterProps {
  readonly options: readonly CategoryOption[];
  readonly activeCategory: string;
  readonly t: Translate;
  readonly onChange: (category: string) => void;
}

export function CategoryFilter({
  options,
  activeCategory,
  t,
  onChange,
}: CategoryFilterProps) {
  const overflow = useCategoryOverflow(options);

  return (
    <div className={`category-filter-shell${overflow.expanded ? " is-expanded" : ""}`}>
      <nav className="category-filter" aria-label={t("categoriesLabel")}>
        {overflow.visibleOptions.map((option) => {
          const active = option.id === activeCategory;
          return (
            <button
              type="button"
              key={option.id}
              className={active ? "is-active" : undefined}
              aria-pressed={active}
              disabled={option.count === 0}
              onClick={() => onChange(option.id)}
            >
              <span>{option.label}</span>
              <span className="category-count">{option.count.toLocaleString()}</span>
            </button>
          );
        })}

        {overflow.hiddenOptionCount > 0 ? (
          <button
            type="button"
            className="category-overflow-button"
            aria-expanded={overflow.expanded}
            aria-label={
              overflow.expanded ? t("collapseCategories") : t("expandCategories")
            }
            onClick={overflow.toggleExpanded}
          >
            <span>{overflow.expanded ? t("collapseCategories") : t("moreCategories")}</span>
            {!overflow.expanded && overflow.hiddenRepositoryCount > 0 ? (
              <span className="category-count">
                {overflow.hiddenRepositoryCount.toLocaleString()}
              </span>
            ) : null}
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d="m6 8 4 4 4-4" />
            </svg>
          </button>
        ) : null}
      </nav>
    </div>
  );
}
