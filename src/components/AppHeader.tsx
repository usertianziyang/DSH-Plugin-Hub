import type { Lang } from "../i18n";
import type { ExplorerSection } from "../hooks/usePluginExplorer";
import type { Snapshot } from "../types";
import type { Translate } from "../ui-types";
import {
  APP_BADGE,
  APP_LINKS,
  APP_NAME,
  HEADER_NAV_ITEMS,
} from "../data/mockData";
import type { HeaderNavItem } from "../data/mockData";
import { BrandLogo } from "./BrandLogo";
import { useScrolledHeader } from "../hooks/useScrolledHeader";

export interface AppHeaderProps {
  readonly snapshot: Snapshot | null;
  readonly lang: Lang;
  readonly t: Translate;
  readonly searchActive: boolean;
  readonly activeSection: ExplorerSection;
  readonly onSearchOpen: () => void;
  readonly onSectionChange: (section: ExplorerSection) => void;
  readonly onLanguageToggle: () => void;
}

/**
 * 主导航按钮图标（内联 SVG，stroke 描边风格，与 icon-button 的放大镜保持一致）。
 * 通过 currentColor 继承按钮文字颜色，hover / 选中时随文字同步变色。
 */
function NavIcon({ id }: { readonly id: HeaderNavItem["id"] }) {
  if (id === "top") {
    // 奖杯：表示「排名 / Top」
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    );
  }
  if (id === "featured") {
    // 星星：表示「精选」
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <polygon points="12 2.5 15.09 8.26 21.5 9.27 17 13.85 18.18 20.5 12 17.27 5.82 20.5 7 13.85 2.5 9.27 8.91 8.26 12 2.5" />
      </svg>
    );
  }
  // 指南针：表示「探索」
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function AppHeader({
  snapshot,
  lang,
  t,
  searchActive,
  activeSection,
  onSearchOpen,
  onSectionChange,
  onLanguageToggle,
}: AppHeaderProps) {
  const header = useScrolledHeader();
  const atTop = header.atTop && activeSection === "top";

  return (
    <header className={`site-header ${atTop ? "is-at-top" : "is-scrolled"}`}>
      <div className="header-shell">
        <a className="brand" href={APP_LINKS.home} aria-label={APP_NAME}>
          <span className="brand-mark" aria-hidden="true">
            <BrandLogo />
          </span>
          <span className="brand-name">{APP_NAME}</span>
          <span className="brand-badge">{APP_BADGE}</span>
        </a>

        <nav className="primary-nav" aria-label={t("primaryNavigation")}>
          {HEADER_NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === activeSection ? "is-active" : undefined}
              aria-pressed={item.id === activeSection}
              onClick={() => onSectionChange(item.id)}
            >
              <NavIcon id={item.id} />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          {snapshot?.meta.complete ? (
            <span className="sync-dot" title={t("syncComplete")} aria-label={t("syncComplete")} />
          ) : null}
          <button
            type="button"
            className={`icon-button${searchActive ? " is-active" : ""}`}
            onClick={onSearchOpen}
            aria-label={t("searchLabel")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5" />
            </svg>
          </button>
          <button
            type="button"
            className="language-toggle"
            onClick={onLanguageToggle}
            aria-label={t("langSwitchTo")}
          >
            <span className={lang === "zh" ? "is-selected" : undefined}>{t("langZh")}</span>
            <span className={lang === "en" ? "is-selected" : undefined}>{t("langEn")}</span>
          </button>
          <a
            className="github-button"
            href={APP_LINKS.repository}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 .7a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .7Z" />
            </svg>
            <span>{t("openGithub")}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
