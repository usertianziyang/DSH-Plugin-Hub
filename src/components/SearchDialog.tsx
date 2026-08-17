import { useEffect, useRef } from "react";
import type { Translate } from "../ui-types";

export interface SearchDialogProps {
  readonly query: string;
  readonly t: Translate;
  readonly onQueryChange: (value: string) => void;
  readonly onClose: () => void;
}

export function SearchDialog({
  query,
  t,
  onQueryChange,
  onClose,
}: SearchDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="search-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="search-dialog-heading">
          <div>
            <p>{t("searchKicker")}</p>
            <h2 id="search-dialog-title">{t("searchLabel")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("closeSearch")}>
            ×
          </button>
        </div>
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
          {query ? (
            <button type="button" onClick={() => onQueryChange("")} aria-label={t("clearSearch")}>
              ×
            </button>
          ) : null}
        </label>
        <p className="search-hint">{t("searchHint")}</p>
      </section>
    </div>
  );
}
