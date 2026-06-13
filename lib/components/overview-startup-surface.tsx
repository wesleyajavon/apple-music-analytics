/**
 * Shell visuel partagé pour les cartes « startup » du dashboard overview
 * — aligné sur les tokens design (surface-glass, card-border, brand gradients).
 */

export const OVERVIEW_STARTUP_SURFACE_BASE =
  "relative overflow-hidden rounded-[2rem] border border-card-border bg-surface-glass text-foreground shadow-card backdrop-blur-xl ring-1 ring-white/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:ring-white/[0.06]";

export const OVERVIEW_STARTUP_EYEBROW_PILL_CLASS =
  "mb-3 inline-flex items-center gap-2 rounded-full border border-accent-cyan/25 bg-accent-cyan/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-cyan dark:border-accent-cyan/18 dark:bg-accent-cyan/12 dark:text-cyan-100";

export const OVERVIEW_STARTUP_HEADER_LINK_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-card-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/28 hover:bg-primary/[0.05] hover:shadow-card dark:border-white/[0.10] dark:bg-[#141622] dark:hover:bg-[#1a1e2e]";

export const OVERVIEW_STARTUP_INNER_PANEL_CLASS =
  "rounded-[1.5rem] border border-card-border bg-surface/70 p-3 shadow-inner backdrop-blur sm:p-5 dark:border-white/[0.06] dark:bg-[#0c0e18]/80";

export const OVERVIEW_STARTUP_WIDGET_TITLE_CLASS =
  "text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl";

export const OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS =
  "mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base";

export const OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS =
  "border-b border-card-border dark:border-white/[0.06]";

export function OverviewStartupSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-brand-gradient-soft opacity-70 dark:opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/10 blur-3xl dark:bg-accent-cyan/12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        aria-hidden
      />
    </>
  );
}
