"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Legacy Crystal: cinematic hero card (glow, rounded-[2rem], ring).
 * Forbidden on Overview Crystal. Keep for onboarding and remaining non-Crystal pages.
 */
export const DASHBOARD_CINEMATIC_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-accent-violet/30 bg-gray-950 text-white shadow-2xl shadow-accent-violet/25 ring-1 ring-accent-violet/15";

export function DashboardCinematicHeroBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.28),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(79,144,224,0.24),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden
      />
    </>
  );
}

/** Onboarding glass card. Not Crystal chrome — use DASHBOARD_GLASS_CHROME for sidebar/header. */
export const DASHBOARD_GLASS_CARD_SHELL =
  "relative overflow-hidden rounded-3xl border border-card-border bg-surface-glass px-6 py-8 shadow-card backdrop-blur-xl sm:px-8 sm:py-10";

/**
 * Legacy Crystal: widget data card (rounded-[2rem], shadow-card, hover lift).
 * Forbidden on Overview Crystal. Keep for other dashboard pages until they migrate.
 */
export const DASHBOARD_WIDGET_CARD_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-card to-surface shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06]";

/** Crystal chrome (sidebar, header, segmented track). Not a content card. */
export const DASHBOARD_GLASS_CHROME =
  "dashboard-glass-chrome border-glass-hairline";

/** Replay-style floating chrome pane (sidebar + desktop header). */
export const DASHBOARD_GLASS_SIDEBAR =
  "dashboard-glass-sidebar border border-glass-hairline";

/** Same frost, radius, and shadow for sidebar and desktop header. */
export const DASHBOARD_GLASS_FLOATING_PANE =
  `${DASHBOARD_GLASS_SIDEBAR} rounded-[1.25rem] shadow-[0_8px_40px_rgb(23_19_33_/_0.08)] dark:shadow-[0_12px_40px_rgb(0_0_0_/_0.45)]`;

/** Replay / iOS segmented track: same frost as header chrome, hairline, no chip-cards. */
export const DASHBOARD_SEGMENTED_TRACK =
  "dashboard-glass-chrome inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-glass-hairline p-1";

/**
 * Desktop chart controls (group-by + cumulative), sticky under the period header.
 * Horizontal inset matches DateRangeFilter: header `lg:px-3` + filter `px-3` = 24px
 * against main `lg:p-8` → `lg:-mx-8 lg:px-6`. No chrome bar — pills only, like the period filter.
 */
export const DASHBOARD_CHART_CONTROLS_ROW =
  "sticky top-[var(--dashboard-filter-height)] z-20 hidden flex-wrap items-center gap-2 py-2 lg:-mx-8 lg:flex lg:px-6";

/** Inactive segmented pill. Pair with DASHBOARD_SEGMENTED_PILL_ACTIVE. */
export const DASHBOARD_SEGMENTED_PILL =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-3.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Active segmented pill: opaque contrast, no brand glow. */
export const DASHBOARD_SEGMENTED_PILL_ACTIVE =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-surface-raised px-3.5 text-[13px] font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/12";

/** iOS search field on the canvas (not a card). */
export const DASHBOARD_SEARCH_FIELD =
  "h-11 w-full rounded-full border border-glass-hairline bg-surface-raised pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Inactive series chip (artist / track / genre). */
export const DASHBOARD_FILTER_CHIP =
  "inline-flex min-h-11 max-w-[min(100%,260px)] shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45";

/** Selected series chip: same matter as an active segmented pill. */
export const DASHBOARD_FILTER_CHIP_ACTIVE =
  "inline-flex min-h-11 max-w-[min(100%,260px)] shrink-0 items-center gap-2 rounded-full bg-surface-raised px-3.5 text-[13px] font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/12";

/** Sidebar nav row (inactive). Soft Replay pill, not a card. */
export const DASHBOARD_NAV_ITEM =
  "group flex min-h-11 items-center rounded-[10px] text-[13px] font-medium text-muted transition-colors hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.08]";

/** Sidebar nav row (active): denser frost, no brand tick. */
export const DASHBOARD_NAV_ITEM_ACTIVE =
  "group flex min-h-11 items-center rounded-[10px] bg-black/[0.07] text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-white/12";

/** 13px muted eyebrow above a canvas section title. */
export const DASHBOARD_SECTION_EYEBROW =
  "text-[13px] font-medium text-muted";

/** Large section title on the canvas (not a widget header). */
export const DASHBOARD_SECTION_TITLE =
  "text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground";

/** Square artwork frame (album / track). Consumer sets width. */
export const DASHBOARD_FEATURED_MEDIA =
  "relative aspect-square overflow-hidden rounded-[12px] bg-surface";

/** Round artwork frame (artist). Consumer sets width. */
export const DASHBOARD_FEATURED_MEDIA_ARTIST =
  "relative aspect-square overflow-hidden rounded-full bg-surface";

/** iOS grouped list row. Combine with DASHBOARD_LIST_SEPARATOR. */
export const DASHBOARD_LIST_ROW =
  "flex min-h-11 w-full items-center gap-3 py-2.5 text-left";

/** Interactive ranking row hover tint (artists / tracks lists). */
export const DASHBOARD_LIST_ROW_INTERACTIVE =
  "cursor-pointer transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.06]";

export const DASHBOARD_LIST_SEPARATOR =
  "border-b border-glass-hairline last:border-b-0";

/** KPI strip container (not STATS_SHELL cards). */
export const DASHBOARD_METRIC_STRIP =
  "flex flex-wrap";

export const DASHBOARD_METRIC_CELL =
  "flex min-w-0 flex-1 flex-col gap-1 border-r border-glass-hairline px-5 py-1 first:pl-0 last:border-r-0 last:pr-0";

export const DASHBOARD_METRIC_VALUE =
  "text-2xl font-semibold tracking-tight tabular-nums text-foreground";

export const DASHBOARD_METRIC_LABEL =
  "text-[13px] text-muted";

export const DASHBOARD_BTN_GRADIENT =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0";

export const DASHBOARD_BTN_OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-card-border bg-surface-raised px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/28 hover:bg-primary/[0.05] hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/12 dark:bg-white/[0.06] dark:hover:border-white/22 dark:hover:bg-white/[0.1]";

export const DASHBOARD_BTN_GHOST =
  "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-55";

export const DASHBOARD_BTN_LINK =
  "inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-card-border bg-white/70 px-4 py-2.5 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:border-white/[0.10] dark:bg-[#161822] dark:hover:bg-[#1c2030]";

type DashboardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  fullWidth?: boolean;
};

export const DashboardGradientButton = forwardRef<HTMLButtonElement, DashboardButtonProps>(
  function DashboardGradientButton(
    { className = "", isLoading, fullWidth = true, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`${DASHBOARD_BTN_GRADIENT} ${fullWidth ? "w-full sm:w-auto" : ""} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

export const DashboardOutlineButton = forwardRef<HTMLButtonElement, DashboardButtonProps>(
  function DashboardOutlineButton(
    { className = "", isLoading, fullWidth = true, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`${DASHBOARD_BTN_OUTLINE} ${fullWidth ? "w-full sm:w-auto" : ""} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

export function DashboardWidgetCardBg({ glowClass }: { glowClass?: string }) {
  return (
    <>
      {glowClass ? (
        <div
          className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl ${glowClass}`}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-80"
        aria-hidden
      />
    </>
  );
}

export function DashboardOnboardingProviderCard({
  onClick,
  logo,
  badge,
  title,
  hint,
  hoverAccentClass,
}: {
  onClick: () => void;
  logo: ReactNode;
  badge?: string;
  title: string;
  hint: string;
  hoverAccentClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.35rem] border border-card-border bg-card-surface/80 p-4 text-left shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${hoverAccentClass}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-brand-gradient-soft opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-surface-raised shadow-sm">
        {logo}
      </div>
      <div className="relative min-w-0 flex-1">
        {badge ? (
          <span className="mb-1 inline-flex rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-primary">
            {badge}
          </span>
        ) : null}
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </div>
      <svg
        className="relative h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
