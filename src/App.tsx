import { AppHeader } from "./components/AppHeader";
import { CategoryFilter } from "./components/CategoryFilter";
import { FeaturedPlugins } from "./components/FeaturedPlugins";
import { GuideSection } from "./components/GuideSection";
import { HeroSection } from "./components/HeroSection";
import { PixelLogoBackground } from "./components/PixelLogoBackground";
import { ResultsPanel } from "./components/ResultsPanel";
import { SearchDialog } from "./components/SearchDialog";
import { SiteFooter } from "./components/SiteFooter";
import { usePluginExplorer } from "./hooks/usePluginExplorer";

export interface AppProps {}

export default function App(_props: AppProps) {
  const explorer = usePluginExplorer();

  return (
    <div className="app-shell">
      <PixelLogoBackground />
      <AppHeader
        snapshot={explorer.snapshot}
        lang={explorer.lang}
        t={explorer.t}
        searchActive={explorer.query.length > 0}
        activeSection={explorer.section}
        onSearchOpen={explorer.openSearch}
        onSectionChange={explorer.setSection}
        onLanguageToggle={explorer.toggleLanguage}
      />

      <main className="main-content">
        {explorer.viewMode === "featured" ? (
          <FeaturedPlugins items={explorer.snapshot?.items ?? []} t={explorer.t} />
        ) : explorer.viewMode === "guide" ? (
            <GuideSection lang={explorer.lang} t={explorer.t} />
          ) : (
          <>
            {explorer.viewMode === "top" ? (
              <HeroSection snapshot={explorer.snapshot} lang={explorer.lang} t={explorer.t} />
            ) : null}

            {explorer.viewMode === "search" ? (
              <div className="active-search" role="status">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 5 5" />
                </svg>
                <span
                  className="active-search-text"
                  title={explorer.t("activeSearch", { query: explorer.query })}
                >
                  {explorer.t("activeSearch", { query: explorer.query })}
                </span>
                <button
                  type="button"
                  className="active-search-clear"
                  onClick={explorer.clearSearch}
                  aria-label={explorer.t("clearSearch")}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ) : explorer.inlineSearchOpen ? (
              <form
                className="search-form inline-search"
                aria-label={explorer.t("searchLabel")}
                onSubmit={(event) => {
                  event.preventDefault();
                  explorer.applySearch();
                }}
              >
                <label className="search-field">
                  <span className="visually-hidden">{explorer.t("searchLabel")}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 5 5" />
                  </svg>
                  <input
                    type="search"
                    value={explorer.searchDraft}
                    onChange={(event) => explorer.setSearchDraft(event.target.value)}
                    placeholder={explorer.t("searchPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                  />
                  {explorer.searchDraft.trim() ? (
                    <button
                      type="button"
                      className="search-field-clear"
                      onClick={() => explorer.setSearchDraft("")}
                      aria-label={explorer.t("clearSearch")}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9 9l6 6M15 9l-6 6" />
                      </svg>
                    </button>
                  ) : null}
                </label>
                <button type="submit" className="search-submit">
                  {explorer.t("searchAction")}
                </button>
              </form>
            ) : null}

            {explorer.state.status === "success" && explorer.viewMode !== "top" ? (
              <CategoryFilter
                options={explorer.categoryOptions}
                activeCategory={explorer.category}
                t={explorer.t}
                onChange={explorer.setCategory}
              />
            ) : null}

            <ResultsPanel
              state={explorer.state}
              items={explorer.filteredItems}
              query={explorer.query}
              topCount={explorer.topCount}
              totalCount={explorer.totalCount}
              limit={explorer.limit}
              viewMode={explorer.viewMode}
              activeCategoryLabel={explorer.activeCategoryLabel}
              t={explorer.t}
            />
          </>
        )}
      </main>

      <SiteFooter t={explorer.t} />

      {explorer.searchOpen ? (
        <SearchDialog
          query={explorer.searchDraft}
          t={explorer.t}
          results={explorer.searchDraftResults}
          totalCount={explorer.totalCount}
          onQueryChange={explorer.setSearchDraft}
          onSubmit={explorer.applySearch}
          onClose={explorer.closeSearch}
        />
      ) : null}
    </div>
  );
}
