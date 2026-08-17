import { AppHeader } from "./components/AppHeader";
import { CategoryFilter } from "./components/CategoryFilter";
import { HeroSection } from "./components/HeroSection";
import { ResultsPanel } from "./components/ResultsPanel";
import { SearchDialog } from "./components/SearchDialog";
import { SiteFooter } from "./components/SiteFooter";
import { usePluginExplorer } from "./hooks/usePluginExplorer";

export interface AppProps {}

export default function App(_props: AppProps) {
  const explorer = usePluginExplorer();

  return (
    <div className="app-shell">
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
        {explorer.viewMode === "top" ? (
          <HeroSection snapshot={explorer.snapshot} lang={explorer.lang} t={explorer.t} />
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
      </main>

      <SiteFooter t={explorer.t} />

      {explorer.searchOpen ? (
        <SearchDialog
          query={explorer.query}
          t={explorer.t}
          onQueryChange={explorer.setQuery}
          onClose={explorer.closeSearch}
        />
      ) : null}
    </div>
  );
}
