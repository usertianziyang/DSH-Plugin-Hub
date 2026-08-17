import type { PluginItem } from "../types";
import type { Translate } from "../ui-types";

export interface PluginCardProps {
  readonly item: PluginItem;
  readonly rank: number;
  readonly t: Translate;
}

function languageClass(language: string | null): string {
  return `language-dot language-${(language ?? "other").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function PluginCard({ item, rank, t }: PluginCardProps) {
  return (
    <article className="plugin-card" aria-label={`${t("rankLabel", { rank })}: ${item.full_name}`}>
      <div className="plugin-avatar-wrap">
        <img
          className="plugin-avatar"
          src={item.owner_avatar_url}
          alt=""
          loading="lazy"
          width={48}
          height={48}
        />
        <span className="rank-badge" aria-hidden="true">#{rank}</span>
      </div>

      <div className="plugin-content">
        <div className="plugin-heading">
          <div>
            <h2>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("openRepo", { name: item.full_name })}
              >
                {item.full_name}
              </a>
            </h2>
            <p>{t("byOwner", { owner: item.owner })}</p>
          </div>
          <span className="star-count" aria-label={t("starsLabel", { count: item.stars })}>
            <span aria-hidden="true">★</span>
            {item.stars.toLocaleString()}
          </span>
        </div>

        {item.description ? <p className="plugin-description">{item.description}</p> : null}

        <ul className="plugin-metadata" aria-label={t("metadataLabel")}>
          {item.language ? (
            <li><span className={languageClass(item.language)} />{item.language}</li>
          ) : null}
          {item.license ? <li><span aria-hidden="true">⚖</span>{item.license}</li> : null}
          <li><span aria-hidden="true">⑂</span>{item.forks.toLocaleString()} {t("forks")}</li>
          <li><span aria-hidden="true">◉</span>{item.open_issues.toLocaleString()} {t("issues")}</li>
          {item.archived ? <li className="metadata-warning">{t("archived")}</li> : null}
          {item.fork ? <li className="metadata-info">{t("fork")}</li> : null}
        </ul>

        {item.topics.length ? (
          <ul className="topic-list" aria-label={t("topicsLabel")}>
            {item.topics.slice(0, 6).map((topic) => <li key={topic}>{topic}</li>)}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
