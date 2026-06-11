# Design

Visual system for ML Math Viz. Register: product (see PRODUCT.md). The chrome is a dark "ink rail" against a light content surface; all color in the content area is reserved for data and state.

## Theme

- **Layout**: dark navy sidebar rail (fixed 276px desktop, slide-in drawer ≤980px) + light content area, max-width 1100px, centered.
- **One theme, locked**: the rail is chrome, not a theme flip. Content is always light.

## Color

All tokens live in `:root` in `src/styles.css`.

| Role | Token | Value |
| --- | --- | --- |
| Content background | `--bg` | `#f4f6f9` |
| Card / panel surface | `--panel` | `#ffffff` |
| Text | `--ink` | `#16202e` |
| Secondary text | `--muted` | `#5a6473` |
| Accent (controls, indicators) | `--accent` | `#0d9488` |
| Accent fill w/ white text (AA) | `--accent-strong` | `#0f766e` |
| Accent text on tint | `--accent-ink` | `#0b5d56` |
| Accent tint | `--accent-soft` | `#d7f2ee` |
| Rail background | `--rail-bg` | `#0e1524` |
| Rail text | `--rail-text` | `#c8d0e0` |
| Rail active text | `--rail-accent` | `#5eead4` |

Rules:
- The teal accent is **chrome and model-output only** (buttons, sliders, active nav, fitted curves). Data classes use `CLASS_COLORS` in `src/lib/plot.ts` (blue, orange, emerald, pink, violet, yellow); never recolor those to the accent.
- White text sits only on `--accent-strong` or darker (AA 4.5:1). `--accent` is for non-text fills.
- Brand mark gradient: `linear-gradient(135deg, #14b8a6, #0891b2)`.

## Typography

- **UI**: Geist Variable (`@fontsource-variable/geist`), system-ui fallback. One family for headings, body, controls.
- **Numerals & axis labels**: Geist Mono Variable with `tabular-nums` (stat values, slider values, SVG tick/axis labels, progress counts).
- **Math**: KaTeX renders formulas; never restyle its internals.
- Scale: h1 30px/-0.02em (24px mobile), section h3 16.5px, body 14.5px, controls 13px, micro-labels 11-12.5px. Fixed rem-equivalent sizes, no fluid clamp.

## Shape & elevation

- Radius scale: **8px controls** (`--r-control`), **12px cards/panels** (`--r-card`), **full-pill chips** (level badges, count badges). Nothing else.
- Shadows: `--shadow-card` (hairline lift) on light cards; `--shadow-drawer` on the mobile drawer. No decorative glows.

## Motion

- Easing: `--ease-out: cubic-bezier(0.23,1,0.32,1)` for UI; `--ease-drawer: cubic-bezier(0.32,0.72,0,1)` for the drawer; `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)` for catalog-card hover lift only.
- Home: staggered entrance (0/40/80ms), IntersectionObserver reveals per catalog section with 45ms per-card cascade, and a live hero demo (a real 2-4-4-1 network training on XOR via rAF). All of it collapses under reduced motion.
- Durations: 120-140ms control feedback, 220ms content entrance (staggered 0/40/80ms), 280ms drawer.
- Press feedback: `scale(0.97)` on buttons, `scale(0.92)` on icon buttons.
- Every transition lists explicit properties; hover effects are gated behind `@media (hover: hover) and (pointer: fine)`; everything degrades under `prefers-reduced-motion: reduce`.

## Components

Shared vocabulary used by all 25 visualizations (do not fork per-topic):
`.btn` / `.btn-primary` / `.btn-ghost` / `.btn-class` (color swatch via `::before`), `.slider`, `.checkbox`, `.stat`, `.loss-chart`, `.callout` / `.callout-warn`, `.hint`, `.explain`, `.viz-row` / `.viz-svg` / `.viz-side`, `.skeleton` (loading), `.pager`.

Rail components: `.rail-filter` (topic search), `.nav-link` + `.nav-check` (visited state), `.rail-progress` (pinned footer).

## Loading & errors

- Lazy-loaded visualizations show `VizSkeleton` (shape-matched shimmer blocks, no spinners).
- Load failures render an inline `.viz-error` callout with a Retry button (see `VizBoundary` in `src/App.tsx`).
