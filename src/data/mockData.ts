import type { MessageKey } from "../i18n";

export const TOP_PLUGIN_LIMIT = 10;
export const EXPLORER_PAGE_SIZE = 30;
export const COLLAPSED_CATEGORY_LIMIT = 4;
export const HEADER_REVEAL_SCROLL_Y = 8;
export const APP_NAME = "DSH Plugin Hub";
export const APP_BADGE = "Deepseek Harness";

export const APP_LINKS = Object.freeze({
  home: "/",
  host: "https://github.com/deepseek-ai/deepseek-harness",
  topic: "https://github.com/topics/dsh-plugin",
});

export interface HeaderNavItem {
  readonly id: "explore" | "top";
  readonly labelKey: MessageKey;
}

export const HEADER_NAV_ITEMS: readonly HeaderNavItem[] = [
  { id: "top", labelKey: "navTopTen" },
  { id: "explore", labelKey: "navExplore" },
];

export interface FooterLink {
  readonly href: string;
  readonly labelKey: MessageKey;
}

export const FOOTER_LINKS: readonly FooterLink[] = [
  { href: APP_LINKS.host, labelKey: "navHost" },
  { href: APP_LINKS.topic, labelKey: "openGithub" },
];
