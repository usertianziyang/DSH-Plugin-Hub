export type Lang = "en" | "zh";

const STORAGE_KEY = "dsh-plugin-hub:lang";

const messages = {
  en: {
    siteBadge: "Community index",
    tagline: "Explore open-source plugins and tools for DeepSeek Harness.",
    scopePrefix: "A searchable index of public GitHub repositories tagged with ",
    scopeSuffix: ", ranked by stars.",

    sourceLabel: "Source:",
    sourceTopicSuffix: "— this topic defines the repositories indexed on this page.",
    lastSynced: "Last synced:",
    notSynced: "not yet synced",

    loading: "Loading plugin index…",
    loadFailed: "Failed to load data",
    loadFailedHint:
      "The plugin index could not be loaded. Please refresh the page or try again later.",

    noData: "No data yet",
    noDataHintPrefix: "The plugin index has not been synchronized yet. Run ",
    noDataHintSuffix: " with a GitHub token to populate it.",

    noResults: "No matching repositories",
    noResultsPrefix: "No repositories matched ",
    noResultsSuffix: ". Try a different search term.",

    searchLabel: "Search plugins",
    searchPlaceholder: "Search by name, owner, description, language, license, or topic…",
    clearSearch: "Clear search",
    closeSearch: "Close search",

    indexedRepos: "{count} indexed repositories",
    matchingResults: "{count} matching results",

    forks: "Forks",
    issues: "Issues",
    language: "Language",
    license: "License",
    topicsLabel: "Topics",
    metadataLabel: "Repository metadata",
    fork: "Fork",
    archived: "Archived",
    openRepo: "Open {name} on GitHub (opens in a new tab)",
    starsLabel: "{count} stars",
    byOwner: "by {owner}",

    previous: "Previous",
    next: "Next",
    pageOf: "Page {current} of {total}",
    paginationLabel: "Pagination",

    footerPrefix: "Data is sourced from the public GitHub topic ",
    footerSuffix:
      ". This index is not an official registry, store, or endorsement, and listing a " +
      "repository does not guarantee that it is safe, maintained, or installable.",

    categoriesLabel: "Categories",
    langSwitchTo: "Switch to Chinese",
  },
  zh: {
    siteBadge: "社区索引",
    tagline: "探索 DeepSeek Harness 的开源插件与工具。",
    scopePrefix: "一个可搜索的公开 GitHub 仓库索引，标签为 ",
    scopeSuffix: "，按 stars 数排序。",

    sourceLabel: "数据来源：",
    sourceTopicSuffix: "——该 Topic 定义了本页索引的仓库范围。",
    lastSynced: "最近同步：",
    notSynced: "尚未同步",

    loading: "正在加载插件索引…",
    loadFailed: "数据加载失败",
    loadFailedHint: "无法加载插件索引，请刷新页面或稍后重试。",

    noData: "暂无数据",
    noDataHintPrefix: "插件索引尚未同步，请使用 GitHub Token 运行 ",
    noDataHintSuffix: " 以生成数据。",

    noResults: "未找到匹配的仓库",
    noResultsPrefix: "没有仓库匹配 ",
    noResultsSuffix: "，请尝试其他搜索词。",

    searchLabel: "搜索插件",
    searchPlaceholder: "按名称、Owner、描述、语言、许可证或标签搜索…",
    clearSearch: "清除搜索",
    closeSearch: "关闭搜索",

    indexedRepos: "共收录 {count} 个仓库",
    matchingResults: "匹配结果 {count} 个",

    forks: "Forks",
    issues: "Issues",
    language: "语言",
    license: "许可证",
    topicsLabel: "标签",
    metadataLabel: "仓库元数据",
    fork: "Fork",
    archived: "已归档",
    openRepo: "在 GitHub 打开 {name}（新窗口）",
    starsLabel: "{count} 颗星",
    byOwner: "由 {owner} 发布",

    previous: "上一页",
    next: "下一页",
    pageOf: "第 {current} 页 / 共 {total} 页",
    paginationLabel: "分页",

    footerPrefix: "数据来自公开的 GitHub Topic ",
    footerSuffix:
      "。本索引并非官方注册表、商店或背书，收录仓库不代表其安全、维护中或可安装。",

    categoriesLabel: "分类",
    langSwitchTo: "Switch to English",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function translate(
  lang: Lang,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = messages[lang][key] ?? messages.en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function detectLang(): Lang {
  try {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "zh") {
        return stored;
      }
    }
  } catch {
    // localStorage unavailable (e.g. some privacy modes); fall through.
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  return "en";
}

export function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore persistence failures.
  }
}
