import type { Translate } from "../ui-types";

export interface LoadMoreButtonProps {
  readonly visibleCount: number;
  readonly totalCount: number;
  readonly remainingCount: number;
  readonly t: Translate;
  readonly onClick: () => void;
}

export function LoadMoreButton({
  visibleCount,
  totalCount,
  remainingCount,
  t,
  onClick,
}: LoadMoreButtonProps) {
  return (
    <div className="load-more-panel">
      <p>{t("showingProgress", { visible: visibleCount, total: totalCount })}</p>
      <button
        type="button"
        aria-label={t("loadMoreCount", { count: remainingCount })}
        onClick={onClick}
      >
        {t("loadMore")}
      </button>
    </div>
  );
}
