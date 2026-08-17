import { useCallback, useMemo, useState } from "react";
import { EXPLORER_PAGE_SIZE } from "../data/mockData";

export interface ProgressiveListState<T> {
  readonly visibleItems: readonly T[];
  readonly hasMore: boolean;
  readonly remainingCount: number;
  readonly loadMore: () => void;
}

export function useProgressiveList<T>(
  items: readonly T[],
  resetKey: string,
): ProgressiveListState<T> {
  const [pagination, setPagination] = useState({
    key: resetKey,
    visibleCount: EXPLORER_PAGE_SIZE,
  });
  const visibleCount =
    pagination.key === resetKey
      ? pagination.visibleCount
      : EXPLORER_PAGE_SIZE;

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount],
  );
  const loadMore = useCallback(() => {
    setPagination((current) => ({
      key: resetKey,
      visibleCount:
        (current.key === resetKey
          ? current.visibleCount
          : EXPLORER_PAGE_SIZE) + EXPLORER_PAGE_SIZE,
    }));
  }, [resetKey]);

  return {
    visibleItems,
    hasMore: visibleItems.length < items.length,
    remainingCount: Math.max(0, items.length - visibleItems.length),
    loadMore,
  };
}
