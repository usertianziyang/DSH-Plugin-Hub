# DSH Plugin Hub

A searchable, client-side index of public GitHub repositories tagged with
`dsh-plugin`, ranked by stars.

**This is not an official registry, store, or marketplace.** Any repository
maintainer can add the `dsh-plugin` topic, so inclusion here is not an
endorsement and does not guarantee that a repository is safe, maintained, or
installable. The precise data boundary is: every public repository carrying the
exact `dsh-plugin` topic that the GitHub REST Search API could return during a
successful, fully-validated sync. Private repositories and repositories without
the exact topic are out of scope, and GitHub's search index may lag a few
minutes behind reality.

## Architecture

```
GitHub REST Search API
        │  (recursive date sharding + integrity checks)
        ▼
public/plugins.json   ← atomic, validated static snapshot
        │
        ▼
React + TypeScript (Vite) — search & pagination entirely in the browser
```

1. `scripts/sync-github.ts` fetches every matching repository via the official
   `GET /search/repositories` endpoint (`q=topic:dsh-plugin`, sorted by stars).
2. The result is cleaned, de-duplicated, globally sorted, and validated, then
   written atomically to `public/plugins.json`.
3. The browser loads `plugins.json` and performs all search/pagination locally.
   The browser never calls the GitHub API.

### Why recursive date sharding

GitHub Search returns at most 100 results per page and only the first 1,000
results of any query. Looping through pages cannot go past that ceiling. To
collect *all* repositories the sync script recursively shards the query by
repository creation date:

```
topic:dsh-plugin created:2008-01-01..<today UTC>
```

Any shard whose `total_count` exceeds 1,000 is split at the midpoint of its date
range into two adjacent, non-overlapping, gap-free closed ranges. When a range
is already a single day but still exceeds 1,000 results (which happens in
practice — e.g. one day can hold thousands of repos), the sync falls back to a
second, orthogonal dimension and bisects by star count (`stars:min..max`). A
single star value that still needs more than one page would make `sort=stars`
degenerate (every repository ties), so the sync falls back to a third orthogonal
dimension and bisects by creation timestamp within the day (down to the second),
reducing each shard to a single page and eliminating offset-pagination drift.
A single second that still exceeds the page size aborts the sync. Truncated data
is never published. All shards are merged and de-duplicated by GitHub repository
`id`, then re-sorted globally.

### Integrity guarantees

A sync is only "successful" when every check passes:

- Every API response is HTTP-successful and has `incomplete_results === false`.
- Every shard has `total_count <= 1000`, fetches exactly
  `Math.ceil(total_count / 100)` pages, and its de-duplicated count equals its
  first-page `total_count`.
- The merged snapshot has no duplicate `id`, every item carries the exact
  `dsh-plugin` topic, counts are non-negative integers, and items are sorted by
  stars desc then `full_name` asc.
- The published `meta.total_count` equals the number of repositories actually
  collected and validated during the run (a "collection-time snapshot"). The
  root `total_count` is still measured before and after collection and logged,
  but it is not used as a publish gate: the live topic grows continuously, so a
  strict before/after equality requirement would never be satisfiable. Each
  shard is still strictly integrity-checked, so no truncated shard is ever
  published.
- The snapshot is serialized to a temp file in the same directory, re-read,
  re-validated, and only then atomically renamed over `public/plugins.json`.
  Any failure cleans up the temp file and leaves the last good snapshot intact.

## Requirements

- Node.js 20.19+ (22.12+ or 24.x recommended)

## Install

```bash
npm ci
```

## Local development

```bash
npm run dev       # start the Vite dev server
npm run test      # run the offline test suite (node:test + tsx)
npm run typecheck # tsc --noEmit
npm run build     # produce dist/
npm run preview   # preview the production build
```

## Syncing data

The sync script reads the token exclusively from `process.env.GITHUB_TOKEN`.
Create a local, git-ignored `.env` (see `.env.example`) or export it inline:

```bash
GITHUB_TOKEN=ghp_xxx npm run sync
```

The token is used only by the sync script. It never appears in frontend code,
`public/plugins.json`, `dist/`, logs, or error messages.

Without a token (or before the first sync), the repository ships a valid
placeholder `public/plugins.json` with `items: []`, `total_count: 0`, and
`complete: false` so local builds still work.

### Snapshot schema

`public/plugins.json` has `meta` (schema version, topic, topic URL, query,
`fetched_at`, `total_count`, `complete`) and `items`, where each item maps a
GitHub repository to: `id`, `name`, `full_name`, `owner`, `owner_avatar_url`,
`url`, `homepage`, `description`, `stars`, `forks`, `open_issues`, `language`,
`license` (SPDX id or `null`), `topics`, `fork`, `archived`, and the three
timestamps. See `src/types.ts`.

## Frontend

- `src/App.tsx` — page shell, async state machine (`idle`/`loading`/`success`/`error`),
  search input, category navigation, URL state (`?q=`, `?cat=`, `page`), and the
  data-source region.
- `src/i18n.ts` — English/Chinese translations, language detection, and persistence.
- `src/categories.ts` — a curated set of representative categories mapped from
  repository topics (e.g. `web-ui` → Web UI, `mcp` → MCP).
- `src/search.ts` — pure, NFKC-normalized, case-insensitive, AND-semantics search.
- `src/main.tsx` — React root.
- `src/styles.css` — design tokens, responsive layout, `prefers-color-scheme`,
  `prefers-reduced-motion`, and a sticky header/search/footer layout.

The header, search bar (with category filters), and footer stay pinned while the
page scrolls. The language toggle switches between English and Chinese and
persists the choice. Categories are derived from each repository's topics
(excluding `dsh-plugin`); plugins are grouped by category and sorted by stars
descending within each category.

The snapshot is loaded via Vite's base URL so the app works at a domain root or
any sub-path:

```ts
const dataUrl = `${import.meta.env.BASE_URL}plugins.json`;
```

Do not hard-code a hosting sub-path. For a sub-path deployment set Vite's base
at build time (no source changes needed):

```bash
VITE_BASE=/my-app/ npm run build
```

## CI, artifacts, and deployment

`.github/workflows/ci.yml` runs offline tests, type-check, and build on every
pull request and push, and additionally performs a full data sync on a 6-hour
schedule and on manual dispatch (only those runs use `github.token`). A
successful build uploads the standard `dist/` directory as a
`dsh-plugin-hub-dist` artifact.

`dist/` is a plain static site that can be served by any static host (Vercel,
Netlify, Cloudflare Pages, S3/CDN, nginx, …). After choosing a host, configure:

- Build command: `npm run build`
- Output directory: `dist`

**This project does not use GitHub Pages**, and no specific hosting provider is
preconfigured. Add provider-specific deployment config only when a target is
chosen.
