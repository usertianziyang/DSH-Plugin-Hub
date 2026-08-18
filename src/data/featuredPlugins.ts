import type { PluginItem } from "../types";

/**
 * 精选插件配置项。
 *
 * 只需维护 GitHub 仓库链接，其余信息（名称、Owner、头像、Stars、描述、
 * 语言、许可证、Topics 等）都会在运行时从插件索引（plugins.json）中
 * 根据 `url` 自动匹配。需要调整精选列表时，只需增删/修改下方配置即可。
 */
export const FEATURED_CATEGORIES = [
  "essential",
  "interface",
  "capability",
  "insights",
  "workflow",
  "fun",
] as const;

export type FeaturedCategory = (typeof FEATURED_CATEGORIES)[number];

export interface FeaturedPluginConfig {
  /** GitHub 仓库链接，用于从插件索引中自动匹配完整信息 */
  readonly url: string;
  /** 固定分类，不受仓库 topics 或同步数据变化影响 */
  readonly category: FeaturedCategory;
  /** 版本号；无版本时传 null（卡片会显示「最新」） */
  readonly version: string | null;
  /** 安装命令 */
  readonly installCommand: string;
  /** 可选：覆盖自动匹配到的仓库描述（如精炼的中文功能简介） */
  readonly description?: string;
}

/** 匹配完成后的精选插件：携带完整仓库信息 + 固定分类 + 安装信息 */
export interface ResolvedFeaturedPlugin {
  readonly item: PluginItem;
  readonly category: FeaturedCategory;
  readonly version: string | null;
  readonly installCommand: string;
}

/**
 * 精选插件配置列表。
 * 顺序即页面展示顺序；分类是人工策展字段，不随索引同步变化。
 */
export const FEATURED_PLUGINS: readonly FeaturedPluginConfig[] = [
  {
    url: "https://github.com/dsh-market/dsh-market",
    category: "essential",
    version: "1.11.2",
    installCommand: "dsh install dshmarket",
    description: "插件生态入口，支持搜索、安装、更新、启停和备份插件。",
  },
  {
    url: "https://github.com/zhu1090093659/dsh-web-ui",
    category: "essential",
    version: null,
    installCommand: "dsh install dsh-web-ui",
  },
  {
    url: "https://github.com/omdsh-dev/DSH-better-sidebar",
    category: "essential",
    version: null,
    installCommand: "dsh install DSH-better-sidebar",
  },
  {
    url: "https://github.com/Electricitysheep/dsh-handbook",
    category: "essential",
    version: null,
    installCommand: "dsh install dsh-handbook",
  },
  {
    url: "https://github.com/Nagi-ovo/dsh-find-plugins",
    category: "essential",
    version: null,
    installCommand: "dsh install dsh-find-plugins",
  },
  {
    url: "https://github.com/ccch1mneyyy/dsh-TUI",
    category: "interface",
    version: "0.8.0",
    installCommand: "dsh install dsh-TUI",
    description: "提供 Claude Code 风格的终端界面。",
  },
  {
    url: "https://github.com/omdsh-dev/dsh-at-file",
    category: "interface",
    version: null,
    installCommand: "dsh install dsh-at-file",
    description: "在输入框中用 @ 搜索并引用工作区文件或目录路径。",
  },
  {
    url: "https://github.com/Bernardxu123/dsh-mobile-gate",
    category: "interface",
    version: null,
    installCommand: "dsh install dsh-mobile-gate",
  },
  {
    url: "https://github.com/QT-Chen/dsh-mic-input",
    category: "interface",
    version: null,
    installCommand: "dsh install dsh-mic-input",
    description:
      "为 DSH Web UI 输入框添加麦克风按钮：浏览器 Web Speech API 实时语音转文字，纯客户端运行、无需服务器与 API Key。Microphone voice input for the DeepSeek Harness Web UI — in the browser, no server, no keys.",
  },
  {
    url: "https://github.com/liustack/modlens",
    category: "capability",
    version: null,
    installCommand: "dsh install modlens",
  },
  {
    url: "https://github.com/Lum1104/dsh-browser",
    category: "capability",
    version: null,
    installCommand: "dsh install dsh-browser",
  },
  {
    url: "https://github.com/LeemanCheung/dsh-token-usage",
    category: "insights",
    version: null,
    installCommand: "dsh install dsh-token-usage",
  },
  {
    url: "https://github.com/Ychris12138/dsh-usage-stats",
    category: "insights",
    version: null,
    installCommand: "dsh install dsh-usage-stats",
  },
  {
    url: "https://github.com/bowenliang123/dsh-context",
    category: "insights",
    version: "0.11.2",
    installCommand: "dsh install dsh-context",
    description: "可视化面板展示上下文组成、Token 趋势、压缩和裁剪。",
  },
  {
    url: "https://github.com/omdsh-dev/dsh_workflow",
    category: "workflow",
    version: null,
    installCommand: "dsh install dsh_workflow",
  },
  {
    url: "https://github.com/NanmiCoder/dsh-agent-teams",
    category: "workflow",
    version: null,
    installCommand: "dsh install dsh-agent-teams",
  },
  {
    url: "https://github.com/csyangwen/dsh-memory-evolve",
    category: "workflow",
    version: null,
    installCommand: "dsh install dsh-memory-evolve",
  },
  {
    url: "https://github.com/Nagi-ovo/dsh-ads",
    category: "fun",
    version: null,
    installCommand: "dsh install dsh-ads",
  },
  {
    url: "https://github.com/aceice01/dsh-whale-pet",
    category: "fun",
    version: null,
    installCommand: "dsh install dsh-whale-pet",
  },
  {
    url: "https://github.com/Tommy00748/dsh-theme-cyberpunk2077",
    category: "fun",
    version: null,
    installCommand: "dsh install dsh-theme-cyberpunk2077",
  },
];

/**
 * 根据配置列表，从插件索引中自动匹配完整仓库信息。
 * 匹配不到的配置项会被跳过（例如索引尚未同步或链接已失效）。
 */
export function resolveFeaturedPlugins(
  items: readonly PluginItem[],
  configs: readonly FeaturedPluginConfig[] = FEATURED_PLUGINS,
): readonly ResolvedFeaturedPlugin[] {
  const byUrl = new Map<string, PluginItem>(items.map((item) => [item.url, item]));
  const resolved: ResolvedFeaturedPlugin[] = [];

  for (const config of configs) {
    const item = byUrl.get(config.url);
    if (!item) continue;
    resolved.push({
      item: config.description
        ? { ...item, description: config.description }
        : item,
      category: config.category,
      version: config.version,
      installCommand: config.installCommand,
    });
  }

  return resolved;
}
