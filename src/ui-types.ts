import type { MessageKey } from "./i18n";
import type { IndexedItem } from "./search";

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

export interface CategoryOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

export interface RankedIndexedItem extends IndexedItem {
  readonly rank: number;
}
