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
  const atTop = header.atTop && activeSection !== "explore";

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
              {t(item.labelKey)}
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
            <span className={lang === "zh" ? "is-selected" : undefined}>中文</span>
            <span className={lang === "en" ? "is-selected" : undefined}>EN</span>
          </button>
          <a
            className="github-button"
            href={APP_LINKS.topic}
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
