import type { RankedIndexedItem, Translate } from "../ui-types";
import { PluginCard } from "./PluginCard";

export interface PluginListProps {
  readonly items: readonly RankedIndexedItem[];
  readonly t: Translate;
}

export function PluginList({ items, t }: PluginListProps) {
  return (
    <ol className="plugin-list">
      {items.map(({ item }) => (
        <li key={item.id}>
          <PluginCard item={item} t={t} />
        </li>
      ))}
    </ol>
  );
}
