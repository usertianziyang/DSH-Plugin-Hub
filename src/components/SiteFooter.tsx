import { APP_LINKS, FOOTER_LINKS } from "../data/mockData";
import type { Translate } from "../ui-types";

export interface SiteFooterProps {
  readonly t: Translate;
}

export function SiteFooter({ t }: SiteFooterProps) {
  return (
    <footer className="site-footer" aria-labelledby="footer-title">
      <div className="footer-shell">
        <div>
          <h2 id="footer-title">{t("footerTitle")}</h2>
          <p>
            {t("footerPrefix")}
            <a href={APP_LINKS.topic} target="_blank" rel="noopener noreferrer">dsh-plugin</a>
            {t("footerSuffix")}
          </p>
        </div>
        <nav aria-label={t("footerNavigation")}>
          {FOOTER_LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
              {t(link.labelKey)}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
