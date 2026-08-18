export type Lang = "en" | "zh";

const STORAGE_KEY = "dsh-plugin-hub:lang";

const messages = {
  en: {
    siteBadge: "Community index",
    tagline: "Explore open-source plugins and tools for DeepSeek Harness.",
    topTenEyebrow: "Community-ranked · Stars Top 10",
    scopePrefix: "A searchable index of public GitHub repositories tagged with ",
    scopeSuffix: ", ranked by stars.",

    sourceLabel: "Source:",
    sourceShort: "Sourced from",
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
    searchAction: "Search",
    searchKicker: "Find in the index",
    searchPlaceholder: "Search by name, owner, description, language, license, or topic…",
    searchHint: "Search across names, owners, descriptions, languages, licenses, and topics.",
    clearSearch: "Clear search",
    closeSearch: "Close search",
    filterApply: "Apply filters",

    indexedRepos: "{count} indexed repositories",
    matchingResults: "{count} matching results",
    allRepositoryResults: "All repositories · {count}",
    categoryResults: "{category} · {count} repositories",
    allRepositoriesScope: "Based on all {count} indexed repositories",
    noCategoryResults: "No repositories are currently assigned to {category}.",
    topRanked: "Top {count} repositories by stars",
    topSummary: "Showing {count} of the Top {limit}",
    sortedByStars: "Sorted by stars",
    loadMore: "Load more",
    loadMoreCount: "Load {count} more repositories",
    showingProgress: "Showing {visible} of {total}",

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

    primaryNavigation: "Primary navigation",
    footerNavigation: "Footer navigation",
    navExplore: "Explore",
    navTopTen: "Top 10",
    navFeatured: "Featured",
    navHost: "Host",
    openGithub: "GitHub",
    syncComplete: "Plugin data is synchronized",

    featuredTitle: "Featured Plugins",
    featuredLatest: "latest",
    featuredCategoriesLabel: "Featured plugin categories",
    featuredCategoryAll: "All featured",
    featuredCategoryEssential: "Essentials",
    featuredCategoryInterface: "Interface & Input",
    featuredCategoryCapability: "Capability Extensions",
    featuredCategoryInsights: "Usage & Insights",
    featuredCategoryWorkflow: "Workflow & Agents",
    featuredCategoryFun: "Themes & Fun",
    copy: "Copy",
    copied: "Copied",
    copyLabel: "Copy install command",
    copiedLabel: "Install command copied",

    footerPrefix: "Data is sourced from the public GitHub topic ",
    footerTitle: "DSH Plugin Hub · Community-maintained index",
    footerSuffix:
      ". This index is not an official registry, store, or endorsement, and listing a " +
      "repository does not guarantee that it is safe, maintained, or installable.",

    categoriesLabel: "Categories",
    moreCategories: "Other",
    expandCategories: "Other — show all categories",
    collapseCategories: "Collapse categories",
    langSwitchTo: "Switch to Chinese",
    langZh: "CN",
    langEn: "EN",
  },
  zh: {
    siteBadge: "社区索引",
    tagline: "探索 DeepSeek Harness 的开源插件与工具",
    topTenEyebrow: "社区排名 · Stars Top 10",
    scopePrefix: "一个可搜索的公开 GitHub 仓库索引，标签为 ",
    scopeSuffix: "，按 stars 数排序。",

    sourceLabel: "数据来源：",
    sourceShort: "数据来自",
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
    searchAction: "搜索",
    searchKicker: "在索引中查找",
    searchPlaceholder: "按名称、Owner、描述、语言、许可证或标签搜索…",
    searchHint: "支持搜索名称、Owner、描述、语言、许可证与标签。",
    clearSearch: "清除搜索",
    closeSearch: "关闭搜索",
    filterApply: "应用筛选",

    indexedRepos: "共收录 {count} 个仓库",
    matchingResults: "匹配结果 {count} 个",
    allRepositoryResults: "全部仓库 · {count} 个",
    categoryResults: "{category} · {count} 个仓库",
    allRepositoriesScope: "基于全部 {count} 个已收录仓库",
    noCategoryResults: "当前没有归入“{category}”的仓库。",
    topRanked: "Stars 排名前 {count} 的仓库",
    topSummary: "Top {limit} 中当前显示 {count} 个",
    sortedByStars: "按 Stars 排序",
    loadMore: "继续加载",
    loadMoreCount: "继续加载 {count} 个仓库",
    showingProgress: "当前显示 {visible} / {total}",

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

    primaryNavigation: "主导航",
    footerNavigation: "页脚导航",
    navExplore: "探索",
    navTopTen: "Top 10",
    navFeatured: "精选插件",
    navHost: "Host 项目",
    openGithub: "GitHub",
    syncComplete: "插件数据已同步",

    featuredTitle: "精选插件",
    featuredLatest: "最新",
    featuredCategoriesLabel: "精选插件分类",
    featuredCategoryAll: "全部精选",
    featuredCategoryEssential: "核心必备",
    featuredCategoryInterface: "界面与输入",
    featuredCategoryCapability: "能力扩展",
    featuredCategoryInsights: "用量与洞察",
    featuredCategoryWorkflow: "工作流与 Agent",
    featuredCategoryFun: "主题与趣味",
    copy: "复制",
    copied: "已复制",
    copyLabel: "复制安装命令",
    copiedLabel: "安装命令已复制",

    footerPrefix: "数据来自公开的 GitHub Topic ",
    footerTitle: "DSH Plugin Hub · 社区维护索引",
    footerSuffix:
      "。本索引并非官方注册表、商店或背书，收录仓库不代表其安全、维护中或可安装。",

    categoriesLabel: "分类",
    moreCategories: "其它",
    expandCategories: "其它，展开全部分类",
    collapseCategories: "收起分类",
    langSwitchTo: "Switch to English",
    langZh: "中文",
    langEn: "英文",
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
