# Soundprint dashboard — Crystal

Dashboard design system for Crystal (Apple-product UI on a **tabbed dashboard**). Scale: **refined**.

This is **not** the marketing landing. Do not copy [`design-system.md`](../design-system.md) (always-dark vitrine). Source of truth: [`app/globals.css`](../app/globals.css), [`lib/components/dashboard-ui.tsx`](../lib/components/dashboard-ui.tsx), [`docs/CRYSTAL_PLAYBOOK.md`](./CRYSTAL_PLAYBOOK.md).

Typography: **Inter** + `system-ui` / `-apple-system`. Do not use licensed SF Pro.

---

## Canvas vs chrome

| Surface | Material | Where |
| --- | --- | --- |
| Chrome | Frosted glass (`DASHBOARD_GLASS_CHROME`) | Sidebar, header, segmented track, Replay pager arrows |
| Content | Matte, on the page canvas | Overview sections, metric strips, non-media lists |
| Media tiles | Full-bleed photo + frost footer (`.dashboard-replay-card-frost`) | Artist / track / genre rankings |

Glass is **not** a section widget. No `rounded-[2rem]`, `shadow-card`, `ring-1`, hover lift, or nested card around a section. Glass **is** allowed on chrome and on the **footer of Replay tiles**.

---

## Tokens

Defined in `:root` (light) and `html.dark` / `.auth-forced-dark`. `--surface-sidebar` and `--surface-glass` stay for current/onboarding UI until later Crystal steps.

| Token | Light | Dark |
| --- | --- | --- |
| `--glass-chrome` | `rgb(255 255 255 / 0.72)` | `rgb(11 13 22 / 0.64)` (`#0b0d16`) |
| `--glass-hairline` | `rgb(23 19 33 / 0.10)` | `rgb(255 255 255 / 0.10)` |
| `--glass-blur` | `24px` | `24px` |

Tailwind: `bg-glass-chrome`, `border-glass-hairline`. Fill + blur also via utility `.dashboard-glass-chrome` (Safari `-webkit-backdrop-filter`).

### `prefers-reduced-transparency`

When `reduce`:

- Light: `--glass-chrome: #ffffff`; `--glass-blur: 0px`
- Dark: `--glass-chrome: #0b0d16`; `--glass-blur: 0px`
- Hairline unchanged

`prefers-reduced-motion` is already global in `globals.css`. Crystal primitives add no lift/translate animations.

---

## Primitives

Exported from `lib/components/dashboard-ui.tsx`, plus the Replay tile utility in `app/globals.css`. **Overview media rankings** copy [`spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx) — not `DASHBOARD_FEATURED_MEDIA` + list rows.

### Chrome

```tsx
<aside className={DASHBOARD_GLASS_CHROME}>
```

`DASHBOARD_GLASS_CHROME` = `dashboard-glass-chrome border-glass-hairline`

No radius, padding, shadow, or ring baked in. Consumers add layout (`sticky`, `w-64`, `border-r`, z-index).

Do **not** use `DASHBOARD_GLASS_CARD_SHELL` for chrome (onboarding card: rounded-3xl, padding, `shadow-card`).

### Segmented control (Replay / iOS)

Track = glass. Active pill = opaque contrast. Inactive = muted, no per-chip border.

```tsx
<div role="tablist" className={DASHBOARD_SEGMENTED_TRACK}>
  <button className={active ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}>
    Label
  </button>
</div>
```

| Export | Recipe |
| --- | --- |
| `DASHBOARD_SEGMENTED_TRACK` | `dashboard-glass-chrome inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-glass-hairline p-1` |
| `DASHBOARD_SEGMENTED_PILL` | `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| `DASHBOARD_SEGMENTED_PILL_ACTIVE` | `inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-surface-raised px-3.5 text-[13px] font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/12` |

Hit target 44px (`min-h-11`). Overflow: `overflow-x-auto` on the track.

### Series chips + search (trends pickers)

Pills on the canvas, not a checkbox well. Used by artist / track pickers and Overview genre chips.

| Export | Recipe |
| --- | --- |
| `DASHBOARD_SEARCH_FIELD` | `h-11` rounded-full, hairline, 13px, no shadow |
| `DASHBOARD_FILTER_CHIP` | `min-h-11` rounded-full, muted, no border |
| `DASHBOARD_FILTER_CHIP_ACTIVE` | Same as active segmented pill (`bg-surface-raised` / `dark:bg-white/12`) + 8px color dot |

### Section title (on canvas)

```tsx
<p className={DASHBOARD_SECTION_EYEBROW}>Eyebrow</p>
<h2 className={DASHBOARD_SECTION_TITLE}>Your Top Artists</h2>
```

| Export | Recipe |
| --- | --- |
| `DASHBOARD_SECTION_EYEBROW` | `text-[13px] font-medium text-muted` |
| `DASHBOARD_SECTION_TITLE` | `text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground` |

### Replay media tile (Overview spotlight — **source of truth**)

Portrait ranking tile. Name + metric always visible. Not a widget card. Not featured #1 + iOS rows.

**Copy:** [`lib/components/spotlight-artists-featured-list.tsx`](../lib/components/spotlight-artists-featured-list.tsx). Use for tracks, artists, and genres (Crystal steps 5+). Do **not** use `DASHBOARD_LIST_ROW` or `CARD_SHELL` for media rankings.

```tsx
<div className="relative aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-black">
  <img className="absolute inset-0 h-full w-full object-cover object-top" alt="" />
  <span className="absolute left-4 top-3 z-20 text-[1.75rem] font-semibold leading-none tracking-tight text-white">
    1
  </span>
  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[46%]" aria-hidden>
    <div className="dashboard-replay-card-frost absolute inset-0" />
  </div>
  <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-4 pt-12 text-center text-white">
    <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight">Name</h3>
    <p className="mt-0.5 text-[13px] font-medium tabular-nums text-white/70">12,400 plays</p>
    <p className="mt-0.5 truncate text-[12px] text-white/55">Subtitle</p>
  </div>
</div>
```

| Piece | Recipe |
| --- | --- |
| Frame | `relative aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-black` |
| Rank | Large white numeral, top-left, always visible |
| Frost | `.dashboard-replay-card-frost` — full-bleed footer, blur + gradient + mask fade. **Not** an inset pill. |
| Type | Centered white: name 15px semibold, metric 13px `tabular-nums` `text-white/70`, subtitle 12px `text-white/55` |
| Grid | Desktop 4-up (`SPOTLIGHT_PAGE_SIZE = 4`). Mobile (étape 6): 2-up. |
| Pager | Range labels `{start}–{end}` above the grid; circular chevrons `h-11 w-11 rounded-full border border-white/25 bg-white/15 backdrop-blur-xl` |
| Section chrome | Eyebrow + `DASHBOARD_SECTION_TITLE` + ghost “See all”. No `rounded-[2rem]` around the section. |

`prefers-reduced-transparency: reduce` already defined on `.dashboard-replay-card-frost` in `globals.css` (opaque gradient, blur 0, no mask).

Hover must not hide the name. Click the tile (button) for insights — not a card chrome.

### Featured media (small frame only)

For a **small** masthead artwork (~120px), not for rankings. Consumer sets `w-*`. No `ring-1`, `shadow-card`, or hover overlay.

| Export | Recipe |
| --- | --- |
| `DASHBOARD_FEATURED_MEDIA` | `relative aspect-square overflow-hidden rounded-[12px] bg-surface` |
| `DASHBOARD_FEATURED_MEDIA_ARTIST` | `relative aspect-square overflow-hidden rounded-full bg-surface` |

### List row (iOS grouped — **non-media only**)

Hairline between rows, not a box per row. No `hover:-translate-y`. Use for friends, settings, and other non-artwork lists. **Do not** use for tracks / artists / genres — those are Replay tiles.

```tsx
<button className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
```

| Export | Recipe |
| --- | --- |
| `DASHBOARD_LIST_ROW` | `flex min-h-11 w-full items-center gap-3 py-2.5 text-left` |
| `DASHBOARD_LIST_SEPARATOR` | `border-b border-glass-hairline last:border-b-0` |

### Metric strip (not `STATS_SHELL`)

Label 13px, large tabular value, hairline between columns.

```tsx
<div className={DASHBOARD_METRIC_STRIP}>
  <div className={DASHBOARD_METRIC_CELL}>
    <span className={DASHBOARD_METRIC_LABEL}>Plays</span>
    <span className={DASHBOARD_METRIC_VALUE}>12,400</span>
  </div>
</div>
```

| Export | Recipe |
| --- | --- |
| `DASHBOARD_METRIC_STRIP` | `flex flex-wrap` |
| `DASHBOARD_METRIC_CELL` | `flex min-w-0 flex-1 flex-col gap-1 border-r border-glass-hairline px-5 py-1 first:pl-0 last:border-r-0 last:pr-0` |
| `DASHBOARD_METRIC_VALUE` | `text-2xl font-semibold tracking-tight tabular-nums text-foreground` |
| `DASHBOARD_METRIC_LABEL` | `text-[13px] text-muted` |

---

## Crystal charts (Overview `view=trends`)

Swift Charts vocabulary: overlapping `Area` + `Line` (`type="monotone"`) in a `ComposedChart`, plot on the canvas. Not a stacked area (that would change how series are read). Not a widget well (`rounded-3xl`, `shadow-inner`, glow orb).

**Copy:** [`lib/components/charts/overview-trends-chart.tsx`](../lib/components/charts/overview-trends-chart.tsx) + [`lib/constants/crystal-chart.ts`](../lib/constants/crystal-chart.ts). Tooltip: [`overview-trends-tooltip.tsx`](../lib/components/charts/overview-trends-tooltip.tsx) (`.crystal-chart-tooltip` frost pill). Period/cumulative: [`listen-trend-chart-view-toggle.tsx`](../lib/components/charts/listen-trend-chart-view-toggle.tsx) (`DASHBOARD_SEGMENTED_*`).

| Piece | Recipe |
| --- | --- |
| Series | `getCrystalSeriesColor(index, theme)` — Soundprint violet / rose / cyan first, then iOS-like hues. Max 10, then wrap. |
| Fill | Translucent area 16–28% under a 2.5–3px round-cap line. |
| Axes | Horizontal X labels 12px muted, `interval="preserveStartEnd"`. Y ~3 ticks, `tabular-nums` compact. No rotated dates. |
| Grid | Horizontal hairlines only, no dash, no vertical grid. |
| Legend | **None** (Recharts `Legend` forbidden here). Series identity lives in the picker / chips. |
| Tooltip | `.crystal-chart-tooltip` — `var(--glass-chrome)` + hairline + blur. Follows light/dark. Not `.chart-tooltip-accessible` (forced white admin box). `prefers-reduced-transparency` already zeros `--glass-blur` and opaques `--glass-chrome`. |
| Toggle | Same segmented track as Overview tabs. Do not restyle with violet chips. |
| Series chips | `DASHBOARD_FILTER_CHIP` / `_ACTIVE` + color dot. Search: `DASHBOARD_SEARCH_FIELD` (pill 44px). No checkboxes, no bordered chip well. Remote hits: list rows + hairline, not a `shadow-card` panel. |

Do **not** use `DASHBOARD_CHART_THEME` / `Legend` / angled X ticks on Overview trends. Dedicated `/dashboard/*/trends` plots stay legacy until Crystal 7.

---

## Legacy — forbidden on Overview Crystal

Do **not** delete yet (onboarding and other pages still use them).

| Export | Why forbidden on Overview |
| --- | --- |
| `DASHBOARD_WIDGET_CARD_SHELL` | `rounded-[2rem]` + `shadow-card` + hover lift |
| `DASHBOARD_CINEMATIC_HERO_SHELL` | Glow violet card |

Also forbidden on Overview rankings: `CARD_SHELL` (`top-three-artists-cards.tsx`, still used on `/artists` until Crystal 7a), `TopLibraryCard` widgets, `STATS_SHELL_CLASS`.

`DASHBOARD_GLASS_CARD_SHELL` is onboarding only — not sidebar/header chrome.

---

## Accent

Soundprint violet / rose / cyan as **touches** (focus ring, active text), not card glows.

---

## Gemini

`designSystem` for later Crystal `modify_frontend` jobs: **this file**. Never `create_frontend` of Overview. One surface per `modify_frontend` call. Media surface = Replay tile (portrait + frost), not featured + list.
