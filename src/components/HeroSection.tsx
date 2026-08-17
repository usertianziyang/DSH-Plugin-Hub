import type { Lang } from "../i18n";
import type { Snapshot } from "../types";
import type { Translate } from "../ui-types";

export interface HeroSectionProps {
  readonly snapshot: Snapshot | null;
  readonly lang: Lang;
  readonly t: Translate;
}

function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
}

export function HeroSection({ snapshot, lang, t }: HeroSectionProps) {
  const topic = snapshot?.meta.topic ?? "dsh-plugin";
  const topicUrl = snapshot?.meta.topic_url ?? "https://github.com/topics/dsh-plugin";

  return (
    <section className="hero" aria-labelledby="page-title">
      <p className="hero-eyebrow">{t("topTenEyebrow")}</p>
      <h1 id="page-title">{t("tagline")}</h1>
      <div className="hero-source">
        <span>{t("sourceShort")}</span>
        <a href={topicUrl} target="_blank" rel="noopener noreferrer">
          GitHub Topic {topic}
        </a>
        {snapshot ? (
          <>
            <span className="source-separator" aria-hidden="true">·</span>
            <span>{t("lastSynced")}</span>
            <time dateTime={snapshot.meta.fetched_at}>
              {formatDate(snapshot.meta.fetched_at, lang)}
            </time>
          </>
        ) : null}
      </div>
    </section>
  );
}
