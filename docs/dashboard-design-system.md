# Soundprint dashboard — Crystal

Dashboard design system for Crystal (Apple-product UI on a **tabbed dashboard**). Scale: **refined**.

This is **not** the marketing landing. Do not copy [`design-system.md`](../design-system.md) (always-dark vitrine). Source of truth: [`app/globals.css`](../app/globals.css), [`lib/components/dashboard-ui.tsx`](../lib/components/dashboard-ui.tsx), [`docs/CRYSTAL_PLAYBOOK.md`](./CRYSTAL_PLAYBOOK.md).

Typography: **Inter** + `system-ui` / `-apple-system`. Do not use licensed SF Pro.

---

## Canvas vs chrome

| Surface | Material | Where |
| --- | --- | --- |
| Chrome | Frosted glass (`DASHBOARD_GLASS_CHROME`) | Sidebar, header, segmented track |
| Content | Matte, on the page canvas | Overview sections, lists, metrics, featured art |

Glass is **not** a content card. No `rounded-[2rem]`, `shadow-card`, `ring-1`, hover lift, or nested widget around a section.

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

Exported from `lib/components/dashboard-ui.tsx`. **Not wired** until Crystal steps 1–5.

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

### Section title (on canvas)

```tsx
<p className={DASHBOARD_SECTION_EYEBROW}>Eyebrow</p>
<h2 className={DASHBOARD_SECTION_TITLE}>Your Top Artist</h2>
```

| Export | Recipe |
| --- | --- |
| `DASHBOARD_SECTION_EYEBROW` | `text-[13px] font-medium text-muted` |
| `DASHBOARD_SECTION_TITLE` | `text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground` |

### Featured media (frame, not a card)

Consumer sets `w-*`. No `ring-1`, `shadow-card`, or hover overlay.

| Export | Recipe |
| --- | --- |
| `DASHBOARD_FEATURED_MEDIA` | `relative aspect-square overflow-hidden rounded-[12px] bg-surface` |
| `DASHBOARD_FEATURED_MEDIA_ARTIST` | `relative aspect-square overflow-hidden rounded-full bg-surface` |

### List row (iOS grouped)

Hairline between rows, not a box per row. No `hover:-translate-y`.

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

## Legacy — forbidden on Overview Crystal

Do **not** delete yet (onboarding and other pages still use them).

| Export | Why forbidden on Overview |
| --- | --- |
| `DASHBOARD_WIDGET_CARD_SHELL` | `rounded-[2rem]` + `shadow-card` + hover lift |
| `DASHBOARD_CINEMATIC_HERO_SHELL` | Glow violet card |

`DASHBOARD_GLASS_CARD_SHELL` is onboarding only — not sidebar/header chrome.

---

## Accent

Soundprint violet / rose / cyan as **touches** (focus ring, active text), not card glows.

---

## Gemini

`designSystem` for later Crystal `modify_frontend` jobs: **this file**. Never `create_frontend` of Overview. One surface per `modify_frontend` call.
