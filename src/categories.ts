import type { PluginItem } from "./types";
import type { Lang } from "./i18n";

export interface Category {
  id: string;
  topics: string[];
  label: Record<Lang, string>;
}

/**
 * A representative, human-curated set of categories. Each category matches a
 * plugin when any of its topics (case-insensitive) is one of the listed topic
 * keywords. The order matters: earlier categories win when a plugin matches
 * several, so more specific categories are listed first.
 */
export const CATEGORIES: Category[] = [
  {
    id: "mcp",
    topics: ["mcp", "mcp-server", "model-context-protocol"],
    label: { en: "MCP", zh: "MCP 服务" },
  },
  {
    id: "web-ui",
    topics: ["web-ui", "ui", "theme", "skin", "gui", "frontend"],
    label: { en: "Web UI", zh: "Web UI" },
  },
  {
    id: "cli",
    topics: ["cli", "command-line", "terminal", "tui"],
    label: { en: "CLI", zh: "命令行" },
  },
  {
    id: "desktop",
    topics: ["desktop-app", "electron", "desktop", "desktop-pet", "dsh-plugin-desktop"],
    label: { en: "Desktop", zh: "桌面应用" },
  },
  {
    id: "vision",
    topics: ["vision", "ocr", "multimodal", "computer-vision"],
    label: { en: "Vision", zh: "视觉" },
  },
  {
    id: "memory",
    topics: ["memory", "agent-memory", "rag", "vector-database"],
    label: { en: "Memory", zh: "记忆" },
  },
  {
    id: "agent",
    topics: [
      "ai-agent",
      "ai-agents",
      "agent",
      "multi-agent",
      "coding-agent",
      "agent-skills",
      "agent-tools",
      "agent-preset",
      "autonomous-agent",
    ],
    label: { en: "Agent", zh: "智能体" },
  },
  {
    id: "security",
    topics: ["security", "cybersecurity"],
    label: { en: "Security", zh: "安全" },
  },
  {
    id: "dev-tools",
    topics: ["developer-tools", "devtools"],
    label: { en: "Developer Tools", zh: "开发工具" },
  },
  {
    id: "editor",
    topics: ["claude-code", "codex", "opencode", "cursor"],
    label: { en: "Editor Integration", zh: "编辑器集成" },
  },
  {
    id: "awesome",
    topics: ["awesome-list", "awesome"],
    label: { en: "Awesome List", zh: "精选列表" },
  },
];

export const ALL_CATEGORY = "all";
export const OTHER_CATEGORY = "other";

export const ALL_LABEL: Record<Lang, string> = { en: "All", zh: "全部" };
export const OTHER_LABEL: Record<Lang, string> = { en: "Other", zh: "其他" };

/** Resolve the representative category id for a plugin. */
export function categorize(item: PluginItem): string {
  const topics = new Set((item.topics ?? []).map((topic) => topic.toLowerCase()));
  for (const category of CATEGORIES) {
    if (category.topics.some((topic) => topics.has(topic))) {
      return category.id;
    }
  }
  return OTHER_CATEGORY;
}

/**
 * Group plugins by category, preserving the input order within each group.
 * Since the dataset is already sorted by stars desc, each group stays sorted
 * by stars desc.
 */
export function groupByCategory(items: PluginItem[]): Map<string, PluginItem[]> {
  const grouped = new Map<string, PluginItem[]>();
  for (const item of items) {
    const id = categorize(item);
    const list = grouped.get(id);
    if (list) {
      list.push(item);
    } else {
      grouped.set(id, [item]);
    }
  }
  return grouped;
}

/** Ordered list of category ids for display: all, curated categories, other. */
export function categoryOrder(): string[] {
  return [ALL_CATEGORY, ...CATEGORIES.map((category) => category.id), OTHER_CATEGORY];
}
