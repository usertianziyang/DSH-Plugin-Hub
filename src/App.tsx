import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PluginItem, Snapshot } from "./types";
import { filterIndexed, indexItems, type IndexedItem } from "./search";
import {
  ALL_CATEGORY,
  ALL_LABEL,
  CATEGORIES,
  OTHER_CATEGORY,
  OTHER_LABEL,
  categorize,
} from "./categories";
import {
  detectLang,
  persistLang,
  translate,
  type Lang,
  type MessageKey,
} from "./i18n";

const PAGE_SIZE = 60;
const dataUrl = `${import.meta.env?.BASE_URL ?? "/"}plugins.json`;

type AsyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; snapshot: Snapshot }
  | { status: "error"; message: string };

type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

function readUrlState(): { query: string; page: number; category: string } {
  const params = new URLSearchParams(window.location.search);
  const query = params.get("q") ?? "";
  const rawPage = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const category = params.get("cat") ?? ALL_CATEGORY;
  return { query, page, category };
}

function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
}

function categoryLabel(id: string, lang: Lang): string {
  if (id === ALL_CATEGORY) return ALL_LABEL[lang];
  if (id === OTHER_CATEGORY) return OTHER_LABEL[lang];
  return CATEGORIES.find((category) => category.id === id)?.label[lang] ?? id;
}

export default function App() {
  const [state, setState] = useState<AsyncState>({ status: "idle" });
  const [lang, setLangState] = useState<Lang>(() => detectLang());
  const [query, setQuery] = useState<string>(() => readUrlState().query);
  const [page, setPage] = useState<number>(() => readUrlState().page);
  const [category, setCategory] = useState<string>(() => readUrlState().category);
  // The search field starts collapsed to an icon; it expands into an overlay
  // input when opened. If the URL already carries a query, start it open.
  const [searchOpen, setSearchOpen] = useState<boolean>(
    () => readUrlState().query.length > 0,
  );

  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  const t = useMemo(
    () => (key: MessageKey, params?: Record<string, string | number>) =>
      translate(lang, key, params),
    [lang],
  );

  const setLang = (next: Lang) => {
    setLangState(next);
    persistLang(next);
  };

  // Update the document title per language.
  useEffect(() => {
    document.title =
      lang === "zh"
        ? "DSH Plugin Hub — 探索 DSH 插件生态"
        : "DSH Plugin Hub — Discover the DSH Plugin Ecosystem";
  }, [lang]);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(dataUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load plugin index (HTTP ${response.status}).`);
        }
        return response.json() as Promise<Snapshot>;
      })
      .then((snapshot) => {
        if (!controller.signal.aborted) {
          setState({ status: "success", snapshot });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: "error", message });
      });

    return () => controller.abort();
  }, []);

  // Measure header/footer heights for the sticky search bar and footer offset.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const update = () => {
      if (headerRef.current) {
        root.style.setProperty("--header-h", `${headerRef.current.offsetHeight}px`);
      }
      if (footerRef.current) {
        root.style.setProperty("--footer-h", `${footerRef.current.offsetHeight}px`);
      }
    };
    update();
    if (typeof ResizeObserver === "undefined") {
      // jsdom / older browsers: sticky offsets fall back to their CSS defaults.
      return;
    }
    const observer = new ResizeObserver(update);
    if (headerRef.current) observer.observe(headerRef.current);
    if (footerRef.current) observer.observe(footerRef.current);
    return () => observer.disconnect();
  }, []);

  const snapshot = state.status === "success" ? state.snapshot : null;

  const indexed = useMemo(
    () => (snapshot ? indexItems(snapshot.items) : []),
    [snapshot],
  );

  // Precompute each item's category once.
  const categorized = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of snapshot?.items ?? []) {
      map.set(item.id, categorize(item));
    }
    return map;
  }, [snapshot]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set(ALL_CATEGORY, snapshot?.items.length ?? 0);
    for (const id of categorized.values()) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [categorized, snapshot]);

  const categoryFiltered = useMemo(() => {
    if (category === ALL_CATEGORY) {
      return indexed;
    }
    return indexed.filter((entry) => categorized.get(entry.item.id) === category);
  }, [indexed, categorized, category]);

  const filtered = useMemo(
    () => filterIndexed(categoryFiltered, query),
    [categoryFiltered, query],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  // Keep the raw page state within the valid range of the current result set.
  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  // Reflect search term, category, and page in the URL without a full reload.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== ALL_CATEGORY) params.set("cat", category);
    if (currentPage > 1) params.set("page", String(currentPage));
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [query, category, currentPage]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <div className="page">
      <header className="site-header" ref={headerRef}>
        <div className="container header-inner">
          <div className="header-main">
            <span className="site-badge">{t("siteBadge")}</span>
            <h1 className="site-title">DSH Plugin Hub</h1>
            <p className="tagline">{t("tagline")}</p>
            <p className="scope">
              {t("scopePrefix")}
              <code>dsh-plugin</code>
              {t("scopeSuffix")}
            </p>
          </div>
          <div className="header-actions">
            <SearchToggle open={searchOpen} onToggle={setSearchOpen} t={t} />
            <button
              type="button"
              className="lang-toggle"
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              aria-label={t("langSwitchTo")}
            >
              {lang === "en" ? "中文" : "English"}
            </button>
          </div>
        </div>
      </header>

      {/* Expanded search overlay: fixed layer pinned under the header so the
          category tags below never shift when the search field opens/closes. */}
      {searchOpen && (
        <div className="search-overlay">
          <div
            className="search-overlay-backdrop"
            onClick={() => setSearchOpen(false)}
          />
          <div className="search-overlay-panel">
            <div className="container">
              <SearchField
                query={query}
                onQueryChange={handleQueryChange}
                onClose={() => setSearchOpen(false)}
                t={t}
              />
            </div>
          </div>
        </div>
      )}

      {/* Data-source label sits at the very top, directly under the header. */}
      <SourceInfo snapshot={snapshot} lang={lang} t={t} />

      {state.status === "success" && (
        <div className="sticky-bar">
          <div className="container search-panel">
            <CategoryNav
              category={category}
              categoryCounts={categoryCounts}
              onCategoryChange={handleCategoryChange}
              lang={lang}
              t={t}
            />
          </div>
        </div>
      )}

      <main className="container">
        {state.status === "loading" || state.status === "idle" ? (
          <div className="status-block" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>{t("loading")}</p>
          </div>
        ) : state.status === "error" ? (
          <div className="status-block status-error" role="alert">
            <h2>{t("loadFailed")}</h2>
            <p>{state.message}</p>
            <p>{t("loadFailedHint")}</p>
          </div>
        ) : (
          <Results
            snapshot={state.snapshot}
            t={t}
            query={query}
            filteredCount={filtered.length}
            currentPage={currentPage}
            totalPages={totalPages}
            pageItems={pageItems}
            onPageChange={setPage}
          />
        )}
      </main>

      <footer className="site-footer" ref={footerRef}>
        <div className="container">
          <p>
            {t("footerPrefix")}
            <a
              href="https://github.com/topics/dsh-plugin"
              target="_blank"
              rel="noopener noreferrer"
            >
              dsh-plugin
            </a>
            {t("footerSuffix")}
          </p>
        </div>
      </footer>
    </div>
  );
}

function SourceInfo({
  snapshot,
  lang,
  t,
}: {
  snapshot: Snapshot | null;
  lang: Lang;
  t: Translate;
}) {
  if (!snapshot) {
    return null;
  }
  return (
    <section className="source-info" aria-label="Data source">
      <div className="container source-info-inner">
        <p>
          {t("sourceLabel")}{" "}
          <a href={snapshot.meta.topic_url} target="_blank" rel="noopener noreferrer">
            GitHub Topic {snapshot.meta.topic}
          </a>{" "}
          {t("sourceTopicSuffix")}
        </p>
        <p className="source-meta">
          {t("lastSynced")}{" "}
          {snapshot.meta.complete ? (
            <time dateTime={snapshot.meta.fetched_at}>
              {formatDate(snapshot.meta.fetched_at, lang)}
            </time>
          ) : (
            <span>{t("notSynced")}</span>
          )}
        </p>
      </div>
    </section>
  );
}

function SearchIcon({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35"
      />
    </svg>
  );
}

// Collapsed search entry: a bare magnifier icon, to the left of the language
// switch. Clicking it expands the search field in the overlay below.
function SearchToggle({
  open,
  onToggle,
  t,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  t: Translate;
}) {
  return (
    <button
      type="button"
      className="search-toggle"
      aria-label={t("searchLabel")}
      aria-expanded={open}
      onClick={() => onToggle(!open)}
    >
      <SearchIcon />
    </button>
  );
}

// Expanded search field shown inside the overlay. Auto-focused on open;
// Escape or the backdrop dismisses it without clearing the query.
function SearchField({
  query,
  onQueryChange,
  onClose,
  t,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  t: Translate;
}) {
  const clearable = query.length > 0;
  return (
    <div className="search">
      <SearchIcon className="search-icon" />
      <label className="visually-hidden" htmlFor="search-input">
        {t("searchLabel")}
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        placeholder={t("searchPlaceholder")}
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />
      {clearable && (
        <button
          type="button"
          className="search-clear"
          onClick={() => onQueryChange("")}
          aria-label={t("clearSearch")}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

function CategoryNav({
  category,
  categoryCounts,
  onCategoryChange,
  lang,
  t,
}: {
  category: string;
  categoryCounts: Map<string, number>;
  onCategoryChange: (value: string) => void;
  lang: Lang;
  t: Translate;
}) {
  const order = [ALL_CATEGORY, ...CATEGORIES.map((item) => item.id), OTHER_CATEGORY];
  const visible = order.filter((id) => {
    const count = categoryCounts.get(id) ?? 0;
    return id === ALL_CATEGORY || id !== OTHER_CATEGORY || count > 0;
  });

  return (
    <nav className="category-nav" aria-label={t("categoriesLabel")}>
      <ul className="category-list">
        {visible.map((id) => {
          const count = categoryCounts.get(id) ?? 0;
          const isActive = category === id;
          return (
            <li key={id}>
              <button
                type="button"
                className={`category-chip${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                onClick={() => onCategoryChange(id)}
              >
                {categoryLabel(id, lang)}
                <span className="category-count">{count.toLocaleString()}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Results({
  snapshot,
  t,
  query,
  filteredCount,
  currentPage,
  totalPages,
  pageItems,
  onPageChange,
}: {
  snapshot: Snapshot;
  t: Translate;
  query: string;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  pageItems: IndexedItem[];
  onPageChange: (page: number) => void;
}) {
  const totalCount = snapshot.meta.total_count;
  const isEmptySnapshot = snapshot.items.length === 0;
  const isNoResults = !isEmptySnapshot && filteredCount === 0;

  return (
    <>
      <div className="stats" aria-live="polite">
        <span>{t("indexedRepos", { count: totalCount.toLocaleString() })}</span>
        <span aria-hidden="true">·</span>
        <span>{t("matchingResults", { count: filteredCount.toLocaleString() })}</span>
      </div>

      {isEmptySnapshot ? (
        <div className="status-block">
          <h2>{t("noData")}</h2>
          <p>
            {t("noDataHintPrefix")}
            <code>npm run sync</code>
            {t("noDataHintSuffix")}
          </p>
        </div>
      ) : isNoResults ? (
        <div className="status-block" role="status">
          <h2>{t("noResults")}</h2>
          <p>
            {t("noResultsPrefix")}
            <strong>“{query}”</strong>
            {t("noResultsSuffix")}
          </p>
        </div>
      ) : (
        <>
          <RepoList items={pageItems} t={t} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            t={t}
          />
        </>
      )}
    </>
  );
}

function RepoList({ items, t }: { items: IndexedItem[]; t: Translate }) {
  return (
    <ul className="repo-list">
      {items.map(({ item }) => (
        <li key={item.id}>
          <RepoCard item={item} t={t} />
        </li>
      ))}
    </ul>
  );
}

function RepoCard({ item, t }: { item: PluginItem; t: Translate }) {
  return (
    <article className="repo-card">
      <div className="repo-card-head">
        <img
          className="repo-avatar"
          src={item.owner_avatar_url}
          alt=""
          loading="lazy"
          width={40}
          height={40}
        />
        <div className="repo-title">
          <h3>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("openRepo", { name: item.full_name })}
            >
              {item.full_name}
            </a>
          </h3>
          <p className="repo-owner">{t("byOwner", { owner: item.owner })}</p>
        </div>
        <span className="stars" aria-label={t("starsLabel", { count: item.stars })}>
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
            <path
              fill="currentColor"
              d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
            />
          </svg>
          {item.stars.toLocaleString()}
        </span>
      </div>

      {item.description ? <p className="repo-description">{item.description}</p> : null}

      <ul className="repo-meta" aria-label={t("metadataLabel")}>
        <li>
          {t("forks")}: <strong>{item.forks.toLocaleString()}</strong>
        </li>
        <li>
          {t("issues")}: <strong>{item.open_issues.toLocaleString()}</strong>
        </li>
        {item.language ? (
          <li>
            {t("language")}: <strong>{item.language}</strong>
          </li>
        ) : null}
        {item.license ? (
          <li>
            {t("license")}: <strong>{item.license}</strong>
          </li>
        ) : null}
      </ul>

      {item.topics.length > 0 ? (
        <ul className="repo-topics" aria-label={t("topicsLabel")}>
          {item.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      ) : null}

      {(item.fork || item.archived) && (
        <div className="repo-badges">
          {item.fork && <span className="badge badge-fork">{t("fork")}</span>}
          {item.archived && (
            <span className="badge badge-archived">{t("archived")}</span>
          )}
        </div>
      )}
    </article>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  t,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  t: Translate;
}) {
  return (
    <nav className="pagination" aria-label={t("paginationLabel")}>
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        {t("previous")}
      </button>
      <span className="page-indicator" aria-live="polite">
        {t("pageOf", { current: currentPage, total: totalPages })}
      </span>
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        {t("next")}
      </button>
    </nav>
  );
}
