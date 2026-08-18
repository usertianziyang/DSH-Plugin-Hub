import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import type { Translate } from "../ui-types";
import { Markdown } from "./Markdown";

interface GuideArticle {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly file: string;
}

interface GuideSectionProps {
  readonly lang: Lang;
  readonly t: Translate;
}

export function GuideSection({ lang, t }: GuideSectionProps) {
  const [articles, setArticles] = useState<readonly GuideArticle[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const base = import.meta.env?.BASE_URL ?? "/";

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`${base}guides/index.json`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load guide index (HTTP ${response.status}).`);
        }
        return response.json() as Promise<{
          readonly articles: readonly GuideArticle[];
        }>;
      })
      .then((data) => {
        if (cancelled) return;
        const nextArticles = data.articles ?? [];
        setArticles(nextArticles);
        setStatus("success");
          const first = nextArticles[0];
        if (first) {
          setActiveSlug(null);
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [base]);

  useEffect(() => {
    if (!activeSlug) return;
    const article = articles.find((item) => item.slug === activeSlug);
    if (!article) return;
    let cancelled = false;
    setStatus("loading");
    fetch(`${base}${article.file}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load guide article (HTTP ${response.status}).`);
        }
        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setStatus("success");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [activeSlug, articles, base]);

  const activeArticle = articles.find((item) => item.slug === activeSlug);
  const articlePath = activeArticle ? `${base}${activeArticle.file}` : "/";
  const resourceBase = articlePath.slice(0, articlePath.lastIndexOf("/") + 1);

  return (
    <section className="guide-section" data-lang={lang} aria-labelledby="guide-title">
      <header className="guide-header">
        <p className="guide-eyebrow">{t("guideEyebrow")}</p>
        <h1 id="guide-title">{t("guideTitle")}</h1>
      </header>

      {status === "loading" ? (
        <p className="guide-status">{t("guideLoading")}</p>
      ) : null}

      {status === "error" ? (
        <p className="guide-status" role="alert">
          {t("guideLoadFailed")}
        </p>
      ) : null}

      {status === "success" && activeSlug === null ? (
        <div className="guide-list">
                      {articles.length > 0 ? (
              <ul className="guide-card-list">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <button
                      type="button"
                      className="guide-card"
                      onClick={() => { setStatus("loading"); setActiveSlug(article.slug); }}
                    >
                      <span className="guide-card-title">{article.title}</span>
                      {article.description ? (
                        <span className="guide-card-description">{article.description}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="guide-status">{t("guideComingSoon")}</p>
            )}
            <p className="guide-coming-soon">{t("guideComingSoon")}</p>
        </div>
      ) : null}

        {activeSlug !== null ? (
          <article className="guide-article">
            <button
              type="button"
              className="guide-back"
              onClick={() => { setActiveSlug(null); setStatus("success"); }}
            >
              ← {t("guideBack")}
            </button>
                          {status === "loading" ? (
                <p className="guide-status">{t("guideLoading")}</p>
              ) : null}
              {status === "error" ? (
                <p className="guide-status" role="alert">
                  {t("guideLoadFailed")}
                </p>
              ) : null}
              {status === "success" && activeArticle ? (
                <Markdown source={content} baseUrl={base} resourceBase={resourceBase} />
              ) : null}
          </article>
        ) : null}


      {/*
        <h2>{t("guideMoreTitle")}</h2>
        {articles.length > 0 ? (
          <ul className="guide-article-list">
            {articles.map((article) => (
              <li key={article.slug}>
                <button
                  type="button"
                  className={article.slug === activeSlug ? "is-active" : undefined}
                  onClick={() => setActiveSlug(article.slug)}
                >
                  {article.title}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="guide-coming-soon">{t("guideComingSoon")}</p>
      */}
    </section>
  );
}
