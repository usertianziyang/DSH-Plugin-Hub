import { useCallback, useMemo, useState } from "react";
import { ALL_CATEGORY, OTHER_CATEGORY } from "../categories";
import { COLLAPSED_CATEGORY_LIMIT } from "../data/mockData";
import type { CategoryOption } from "../ui-types";

export interface CategoryOverflowState {
  readonly expanded: boolean;
  readonly visibleOptions: readonly CategoryOption[];
  readonly hiddenOptionCount: number;
  readonly hiddenRepositoryCount: number;
  readonly toggleExpanded: () => void;
}

export function useCategoryOverflow(
  options: readonly CategoryOption[],
): CategoryOverflowState {
  const [expanded, setExpanded] = useState(false);

  const primaryOptions = useMemo(
    () =>
      options
        .filter(
          (option) =>
            option.id !== ALL_CATEGORY &&
            option.id !== OTHER_CATEGORY &&
            option.count > 0,
        )
        .slice(0, COLLAPSED_CATEGORY_LIMIT),
    [options],
  );

  const collapsedOptions = useMemo(() => {
    const allOption = options.find((option) => option.id === ALL_CATEGORY);
    return allOption ? [allOption, ...primaryOptions] : primaryOptions;
  }, [options, primaryOptions]);

  const hiddenOptions = useMemo(() => {
    const visibleIds = new Set(collapsedOptions.map((option) => option.id));
    return options.filter(
      (option) => option.id !== ALL_CATEGORY && !visibleIds.has(option.id),
    );
  }, [collapsedOptions, options]);

  const toggleExpanded = useCallback(
    () => setExpanded((current) => !current),
    [],
  );

  return {
    expanded,
    visibleOptions: expanded ? options : collapsedOptions,
    hiddenOptionCount: hiddenOptions.length,
    hiddenRepositoryCount: hiddenOptions.reduce(
      (total, option) => total + option.count,
      0,
    ),
    toggleExpanded,
  };
}
