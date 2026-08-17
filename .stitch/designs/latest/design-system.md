---
name: DSH Plugin Hub
colors:
  surface: '#f8f9fb'
  surface-dim: '#f0f2f6'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f9fb'
  surface-container: '#f0f2f6'
  surface-container-high: '#e9edf5'
  surface-container-highest: '#dde4ff'
  on-surface: '#1b1f2b'
  on-surface-variant: '#57606d'
  inverse-surface: '#121623'
  inverse-on-surface: '#e8edf6'
  outline: '#7c8594'
  outline-variant: '#d5d9e3'
  surface-tint: '#4d6bfe'
  primary: '#4d6bfe'
  on-primary: '#ffffff'
  primary-container: '#dde4ff'
  on-primary-container: '#1b1f2b'
  inverse-primary: '#7b8cff'
  secondary: '#6a5cff'
  on-secondary: '#ffffff'
  secondary-container: '#eef1ff'
  on-secondary-container: '#3651e0'
  tertiary: '#16a085'
  on-tertiary: '#ffffff'
  tertiary-container: '#e7f6f3'
  on-tertiary-container: '#0b5d50'
  error: '#d0352e'
  on-error: '#ffffff'
  error-container: '#fdf0ef'
  on-error-container: '#7d1f1b'
  background: '#f8f9fb'
  on-background: '#1b1f2b'
  surface-variant: '#f0f2f6'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.045em
  headline-md:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.035em
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 23px
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.04em
  metadata-xs:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: '0'
rounded:
  sm: 0.5rem
  DEFAULT: 0.625rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 24px
---

# Design System: DSH Plugin Hub

**Project ID:** projects/12231859749223800162

## 1. Visual Theme & Atmosphere

DSH Plugin Hub is a practical, developer-facing discovery index rather than a promotional marketplace. Its personality is trustworthy, current, and quietly technical: cool neutral canvases keep long repository lists easy to scan, while a DeepSeek-inspired blue-to-violet accent gives active controls and navigation a recognizable identity. The interface should feel curated without implying that the listed repositories are officially endorsed.

The page is information-dense but not cramped. Content uses a disciplined 4px/8px spacing rhythm, a narrow reading column, crisp hairline borders, and shallow elevation. Translucent sticky chrome creates continuity while scrolling, and restrained gradients are reserved for brand emphasis. The dark neon search field is the deliberate high-energy moment: it signals that search is the primary task without turning every surface into glass or glow.

Both light and dark appearances are first-class. Light mode uses cool off-white foundations; dark mode uses near-black navy surfaces instead of pure black. Contrast, keyboard focus, reduced motion, bilingual English/Chinese content, and long repository/topic names are structural requirements—not optional polish.

## 2. Color Palette & Roles

### Primary Foundation

- **Cloud Canvas — `#f8f9fb`:** light page background and quiet breathing room around the list.
- **Paper Surface — `#ffffff`:** repository cards, controls, and raised status panels.
- **Soft Cool Fill — `#f0f2f6`:** category hover surfaces and low-emphasis containers.
- **Hairline Cool Gray — `#e7e9ef`:** default card and divider borders.
- **Strong Cool Gray — `#d5d9e3`:** control outlines and higher-emphasis separation.
- **Midnight Canvas — `#0b0e14`:** dark-mode background.
- **Midnight Surface — `#121623`:** dark-mode cards and raised chrome.

### Accent & Interactive

- **DeepSeek Electric Blue — `#4d6bfe`:** primary links, focus rings, active controls, and interaction anchors.
- **Pressed Blue — `#3651e0`:** light-mode hover and stronger text accent.
- **Signal Violet — `#6a5cff`:** gradient partner used to add depth without changing the primary role.
- **Soft Blue Wash — `#eef1ff`:** topic chips, inline code, and subtle interactive backgrounds.
- **Strong Blue Wash — `#dde4ff`:** selected text, focused supporting surfaces, and emphasized borders.
- **Neon Search Violet — `#7c3aed` / `#a855f7`:** search-field glow only.
- **Neon Search Pink — `#ec4899` / `#d946ef`:** search focus and caret accents only.

### Typography & Text Hierarchy

- **Ink — `#1b1f2b`:** primary copy and key numeric data.
- **Slate Copy — `#57606d`:** descriptions, owners, statistics, and secondary labels.
- **Faint Slate — `#7c8594`:** tertiary metadata and disabled states.
- **Dark-Mode Ink — `#e8edf6`:** primary copy on midnight surfaces.
- **Dark-Mode Slate — `#9aa5b8`:** secondary copy on midnight surfaces.

### Functional States

- **Live Teal — `#16a085`:** successful synchronization and live source status.
- **Repository Gold — `#b07c00`:** GitHub star count and popularity signal.
- **Error Red — `#d0352e`:** load failures and destructive/error messaging.
- **Archive Amber — `#8a5a00`:** archived repository badge.
- Functional color must always be paired with text or an icon; color alone never carries meaning.

## 3. Typography Rules

### Font Families

The production code uses the operating-system UI stack: Apple system fonts, Segoe UI, PingFang SC, Noto Sans SC, Microsoft YaHei, and Helvetica/Arial fallbacks. This provides native-feeling bilingual rendering and avoids external font latency. Stitch should use **Inter** as the portable design proxy, with **Noto Sans SC** as the Chinese fallback. Technical metadata and code use a system monospace stack; **JetBrains Mono** is the portable Stitch proxy.

### Hierarchy & Weights

- **Product title:** 26–34px, weight 800, very tight tracking (`-0.045em`), 1.12 line height.
- **Repository title:** 18px desktop / 16px mobile, weight 600, 1.35 line height.
- **Body and tagline:** 16px, weight 400–500, relaxed 1.6 line height.
- **Descriptions and owner labels:** 14px, weight 400, 1.6–1.65 line height.
- **Metadata, chips, and status:** 12–14px, weight 500–700. Use tabular numerals for counts.
- **Compact labels:** slight positive tracking (`0.04em`–`0.05em`) and weight 700.

### Spacing Principles

Headings are compact and confident; descriptive copy is looser for multilingual readability. Avoid oversized marketing typography. Repository names, owner names, descriptions, and topic tokens must tolerate long unbroken strings through wrapping, truncation, or ellipsis without shifting adjacent metrics.

## 4. Component Stylings

### Buttons

Primary compact actions use 36–38px pill containers, 14px semibold labels, and subtle background/border transitions. Active category buttons use the blue-violet gradient with white text and a small colored shadow. Secondary and language actions remain transparent or white with a cool gray outline. Pressed states scale to 96–97%; focus-visible adds a 2px blue ring with 2px offset.

### Search

Search is the dominant action but collapses when not needed. The expanded field is 54px high on desktop and 48–50px on smaller screens, with a 16px radius, near-black fill (`#0c0e15`), pale text, and explicit search, clear, and apply-filter icons. A rotating violet-pink conic border and soft halo intensify on hover/focus. Preserve a reduced-motion version where the ring is static. Search expands inline above categories so category position remains predictable.

### Category Navigation

Categories are compact pills with counts, a minimum 34px height, 5px × 11–13px padding, and 7px gaps. The inactive treatment is quiet and nearly borderless; hover introduces a soft cool fill. The active pill uses the brand gradient. Counts sit in a nested translucent pill. On narrow screens labels can hide, but categories must remain readable and tappable.

### Repository Cards

Cards use white or midnight surfaces, 16px corners, a 1px hairline border, and 24px desktop / 16px mobile padding. Default elevation is almost flat; hover lifts 2px and gains a broad low-opacity shadow. The header row contains a 40px circular owner avatar, repository/owner text, and a gold star pill. Descriptions, metadata, topics, and state badges form clearly separated scan lines beneath it.

### Metadata, Topics, and Badges

Repository metadata is compact and separated by centered dots. Topics use 24px-minimum blue-tinted pills with hairline borders and safe ellipsis for very long tokens. Fork and archived states use labeled badges. Stars use a gold icon plus a tabular count. Do not replace these with unlabeled color-only indicators.

### Status, Empty, and Error Panels

Loading, empty, no-result, and error states occupy the same rounded surface language as cards, with 40px padding and centered copy. Loading uses a 26px blue-topped spinner. Error panels replace neutral borders/backgrounds with the error tokens while preserving readable body copy and a recovery hint.

### Sticky Header and Footer

The header is sticky, translucent, blurred by 12px, and topped by a 3px blue-violet-teal brand line. It holds branding, data provenance, search, and language controls. The category rail sticks below it on a soft fading backdrop. The footer is a compact sticky provenance statement with blur and a top hairline; the content area reserves footer height so the last card is never obscured.

## 5. Layout Principles

### Grid & Structure

Use a centered single-column discovery layout with a **1000px maximum content width**. Desktop gutters are 24px; mobile gutters are 16px. The page sequence is sticky product header → optional expanded search → sticky category filters → result summary → repository list → pagination → sticky provenance footer.

### Whitespace Strategy

The base unit is 4px, with common steps at 8, 16, 24, and 40px. Card-to-card spacing is 16px. Cards use 24px internal padding on desktop and 16px below 720px. Major bottom/top separation and pagination use 40px. Maintain compact header chrome so the repository content remains dominant.

### Alignment & Visual Balance

Brand and explanatory copy are left aligned. Header actions align right on desktop and wrap into a second row below 720px. Repository cards keep star popularity visible at the top right, but allow it to wrap below the title row on very narrow devices. Numeric metadata uses tabular figures for stable visual rhythm.

### Responsive Behavior & Touch

- **≤720px:** header wraps, actions occupy a second row, cards reduce to 16px padding, titles reduce to 16px, and search height drops to 50px.
- **≤480px:** gutters become 16px, search collapses to an icon-only trigger, the community badge and scope note hide, category label hides, repository headers wrap, and pagination tightens.
- Interactive targets should approach 44px wherever layout permits. Never allow sticky chrome to cover focused elements or the final list item.
- Respect `prefers-reduced-motion`; collapse animations and glow rotation to near-zero duration.

## 6. Design System Notes for Stitch Generation

### Language to Use

Use phrases such as **developer utility**, **repository discovery index**, **high-signal information hierarchy**, **compact sticky command bar**, **scan-friendly repository cards**, **bilingual system UI**, **cool neutral surfaces**, and **restrained DeepSeek blue-violet identity**.

Avoid marketplace pricing patterns, oversized hero marketing, excessive glassmorphism, decorative stock imagery, or a card grid that hides repository metadata. The optimized design must remain honest about being a community index sourced from a GitHub topic.

### Color References

Keep core actions in DeepSeek Electric Blue, selection depth in Signal Violet, synchronization in Live Teal, repository popularity in Repository Gold, and error/archive states in their semantic colors. The neon violet-pink search effect is a singular focal treatment, not a general surface style.

### Component Prompts

1. “Create a compact sticky developer-tool header with product identity, community-index status, GitHub synchronization provenance, search access, and bilingual language control. Preserve maximum vertical space for results.”
2. “Create a scan-friendly repository result card with owner avatar, full repository name, owner, star popularity, description, forks/issues/language/license metadata, topic chips, and explicit archived/fork states.”
3. “Create an inline expandable command-search field followed by count-bearing category filters; keep filters stable when the search opens and make keyboard focus and reduced motion explicit.”

### Incremental Iteration

Optimize one layer at a time: first page hierarchy and sticky chrome, then search and filtering, then repository-card scanning, then pagination/status states, and finally mobile reflow. Validate each step against the original information model before moving to the next. Preserve all current content roles even when layout changes.
