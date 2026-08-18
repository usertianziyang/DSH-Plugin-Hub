import type { PluginItem } from "./types";

/**
 * 过滤掉「仅蹭热度、缺乏实用价值」的仓库。
 *
 * 判定基于可客观验证的信号，全部为保守的启发式规则：
 *  - 已归档（停止维护）
 *  - 纯 fork（无独立维护价值，且未提供实质内容说明）
 *  - 缺少描述，或描述过于简短（无法说明用途）
 *  - 缺少许可证（无法合法地安装 / 使用 / 再分发）
 *  - 描述命中「合集 / 榜单」类营销关键词（典型的蹭热度列表仓库）
 */

export type FilterReason =
  | "archived"
  | "forked"
  | "no-description"
  | "short-description"
  | "no-license"
  | "clickbait-description";

/** 描述文本去除首尾空白后仍短于该长度，视为无法说明用途。 */
export const MIN_DESCRIPTION_LENGTH = 20;

/**
 * 「合集 / 榜单」类营销关键词。出现在描述中通常意味着该仓库是
 * awesome-list / 聚合站 / 蹭热度合集，而非一个真正可用的插件。
 */
const CLICKBAIT_PATTERNS: readonly RegExp[] = [
  /\bawesome\b/i,
  /\bcurated\b/i,
  /\bcollection\b/i,
  /\bawesome-list\b/i,
  /\bhot\b/i,
  /\btrending\b/i,
  /\bpopular\b/i,
  /\bviral\b/i,
  /\bbest\b/i,
  /合集/,
  /精选/,
  /推荐/,
  /汇总/,
  /聚合/,
  /榜单/,
];

export interface FilterStats {
  /** 输入仓库总数。 */
  total: number;
  /** 保留的仓库数。 */
  kept: number;
  /** 被剔除的仓库数。 */
  removed: number;
  /** 各剔除原因对应的仓库数量。 */
  reasons: Record<FilterReason, number>;
}

function emptyStats(): FilterStats {
  return {
    total: 0,
    kept: 0,
    removed: 0,
    reasons: {
      archived: 0,
      forked: 0,
      "no-description": 0,
      "short-description": 0,
      "no-license": 0,
      "clickbait-description": 0,
    },
  };
}

/**
 * 判断一个仓库是否应被剔除。返回剔除原因，保留则返回 null。
 */
export function isLowValue(item: PluginItem): FilterReason | null {
  if (item.archived) return "archived";

  const description = item.description?.trim() ?? "";

  if (item.fork && description.length === 0) return "forked";

  if (description.length === 0) return "no-description";
  if (description.length < MIN_DESCRIPTION_LENGTH) return "short-description";

  if (!item.license) return "no-license";

  if (CLICKBAIT_PATTERNS.some((pattern) => pattern.test(description))) {
    return "clickbait-description";
  }

  return null;
}

export interface FilteredResult {
  /** 保留的仓库，保持输入顺序。 */
  readonly kept: PluginItem[];
  /** 被剔除的仓库。 */
  readonly removed: PluginItem[];
  /** 过滤统计。 */
  readonly stats: FilterStats;
}

/**
 * 对采集到的仓库应用低价值过滤，返回保留项与统计信息。
 * 保持输入顺序不变，便于后续按 stars 排序。
 */
export function filterLowValueRepos(items: readonly PluginItem[]): FilteredResult {
  const stats = emptyStats();
  stats.total = items.length;

  const kept: PluginItem[] = [];
  const removed: PluginItem[] = [];

  for (const item of items) {
    const reason = isLowValue(item);
    if (reason === null) {
      kept.push(item);
    } else {
      stats.reasons[reason] += 1;
      removed.push(item);
    }
  }

  stats.kept = kept.length;
  stats.removed = removed.length;

  return { kept, removed, stats };
}
