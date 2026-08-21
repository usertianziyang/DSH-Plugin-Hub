import { useEffect, useMemo, useRef } from "react";
import type { Translate } from "../ui-types";
import type { RankedIndexedItem } from "../ui-types";
import { PluginCard } from "./PluginCard";

export interface SearchDialogProps {
  readonly query: string;
  readonly t: Translate;
  readonly results: readonly RankedIndexedItem[];
  readonly totalCount: number;
  readonly onQueryChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClose: () => void;
}

const MAX_VISIBLE_RESULTS = 20;

export function SearchDialog({
  query,
  t,
  results,
  totalCount,
  onQueryChange,
  onSubmit,
  onClose,
}: SearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Keep the top of the result list visible while typing.
  useEffect(() => {
    resultsRef.current?.scrollTo?.({ top: 0 });
  }, [query]);

  const visibleResults = useMemo(
    () => results.slice(0, MAX_VISIBLE_RESULTS),
    [results],
  );
  const hasQuery = query.trim().length > 0;

  return (
    <div className="search-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <dialog
        open
        className="search-dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        onCancel={onClose}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="search-dialog-heading">
          <div>
            <p>{t("searchKicker")}</p>
            <h2 id="search-dialog-title">{t("searchLabel")}</h2>
          </div>
          <button
            type="button"
            className="search-dialog-close"
            onClick={onClose}
            aria-label={t("closeSearch")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="search-field">
            <span className="visually-hidden">{t("searchLabel")}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
            />
            {hasQuery ? (
              <button
                type="button"
                className="search-field-clear"
                onClick={() => onQueryChange("")}
                aria-label={t("clearSearch")}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 9l6 6M15 9l-6 6" />
                </svg>
              </button>
            ) : null}
          </label>
          <button type="submit" className="search-submit">
            {t("searchAction")}
          </button>
        </form>

        <p className="search-hint">{t("searchHint")}</p>

        <div className="search-results-head" aria-live="polite">
          {hasQuery ? (
            <span className="search-results-count">
              {t("matchingResults", { count: results.length })}
            </span>
          ) : (
            <span className="search-results-count">
              {t("indexedRepos", { count: totalCount })}
            </span>
          )}
          {hasQuery && results.length > MAX_VISIBLE_RESULTS ? (
            <span className="search-results-truncate">
              {t("showingProgress", {
                visible: MAX_VISIBLE_RESULTS,
                total: results.length,
              })}
            </span>
          ) : null}
        </div>

        <div className="search-results" ref={resultsRef} tabIndex={-1}>
          {hasQuery && results.length === 0 ? (
            <div className="search-results-empty">
              <p className="search-results-empty-title">{t("noResults")}</p>
              <p className="search-results-empty-detail">
                {t("noResultsPrefix")}“{query}”{t("noResultsSuffix")}
              </p>
            </div>
          ) : (
            <ol className="plugin-list search-plugin-list">
              {visibleResults.map(({ item }) => (
                <li key={item.id}>
                  <PluginCard item={item} t={t} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </dialog>
    </div>
  );
}
