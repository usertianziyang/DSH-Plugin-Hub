import type {
  AsyncState,
  ExplorerViewMode,
} from "../hooks/usePluginExplorer";
import type { RankedIndexedItem, Translate } from "../ui-types";
import { PluginList } from "./PluginList";
import { StatusPanel } from "./StatusPanel";
import { LoadMoreButton } from "./LoadMoreButton";
import { useProgressiveList } from "../hooks/useProgressiveList";

export interface ResultsPanelProps {
  readonly state: AsyncState;
  readonly items: readonly RankedIndexedItem[];
  readonly query: string;
  readonly topCount: number;
  readonly totalCount: number;
  readonly limit: number;
  readonly viewMode: ExplorerViewMode;
  readonly activeCategoryLabel: string;
  readonly t: Translate;
}

export function ResultsPanel({
  state,
  items,
  query,
  topCount,
  totalCount,
  limit,
  viewMode,
  activeCategoryLabel,
  t,
}: ResultsPanelProps) {
  const progressive = useProgressiveList(
    items,
    `${viewMode}:${activeCategoryLabel}:${query}`,
  );

  if (state.status === "idle" || state.status === "loading") {
    return <StatusPanel message={t("loading")} loading />;
  }

  if (state.status === "error") {
    return (
      <StatusPanel
        title={t("loadFailed")}
        message={state.message}
        detail={t("loadFailedHint")}
        tone="error"
        role="alert"
      />
    );
  }

  if (state.snapshot.items.length === 0) {
    return (
      <StatusPanel
        title={t("noData")}
        message={`${t("noDataHintPrefix")}npm run sync${t("noDataHintSuffix")}`}
      />
    );
  }

  const resultsTitle =
    viewMode === "top"
      ? t("topRanked", { count: topCount })
      : viewMode === "explore"
        ? t("allRepositoryResults", { count: items.length })
        : viewMode === "category"
          ? t("categoryResults", {
              category: activeCategoryLabel,
              count: items.length,
            })
          : t("matchingResults", { count: items.length });
  const resultsDetail =
    viewMode === "top"
      ? t("topSummary", { count: items.length, limit })
      : t("allRepositoriesScope", { count: totalCount });

  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results-summary">
        <div>
          <h2 id="results-title">{resultsTitle}</h2>
          <p>{resultsDetail}</p>
        </div>
        <span className="sort-label">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h11M4 17h6" />
          </svg>
          {t("sortedByStars")}
        </span>
      </div>

      {items.length === 0 ? (
        <StatusPanel
          title={t("noResults")}
          message={
            query
              ? `${t("noResultsPrefix")}“${query}”${t("noResultsSuffix")}`
              : t("noCategoryResults", { category: activeCategoryLabel })
          }
        />
      ) : (
        <>
          <PluginList items={progressive.visibleItems} t={t} />
          {progressive.hasMore ? (
            <LoadMoreButton
              visibleCount={progressive.visibleItems.length}
              totalCount={items.length}
              remainingCount={progressive.remainingCount}
              t={t}
              onClick={progressive.loadMore}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
