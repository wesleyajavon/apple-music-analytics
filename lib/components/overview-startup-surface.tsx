/**
 * Shell visuel partagé pour les cartes « startup » du dashboard overview
 * (gradients, bords arrondis, lien d’action) — aligné sur le bloc timeline / momentum.
 */

export const OVERVIEW_STARTUP_SURFACE_BASE =
  "relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white text-slate-900 shadow-xl shadow-slate-900/[0.06] ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:border-white/[0.08] dark:bg-[#06070d] dark:text-white dark:shadow-2xl dark:shadow-black/30 dark:ring-0 dark:hover:shadow-black/40";

export const OVERVIEW_STARTUP_EYEBROW_PILL_CLASS =
  "mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/90 bg-cyan-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900 dark:border-cyan-400/18 dark:bg-[#0f1824] dark:text-cyan-100";

export const OVERVIEW_STARTUP_HEADER_LINK_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/[0.10] dark:bg-[#141622] dark:text-slate-100 dark:shadow-none dark:hover:bg-[#1a1e2e]";

export const OVERVIEW_STARTUP_INNER_PANEL_CLASS =
  "rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-3 shadow-inner shadow-slate-900/[0.04] backdrop-blur sm:p-5 dark:border-white/[0.06] dark:bg-[#0c0e18] dark:shadow-none";

/** Titres / sous-titres des cartes widget : lisibles sur fond clair (surface blanche) et sombre. */
export const OVERVIEW_STARTUP_WIDGET_TITLE_CLASS =
  "text-3xl font-semibold tracking-[-0.05em] text-slate-900 dark:text-white sm:text-4xl";

export const OVERVIEW_STARTUP_WIDGET_SUBTITLE_CLASS =
  "mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base";

export const OVERVIEW_STARTUP_WIDGET_HEADER_BORDER_CLASS =
  "border-b border-slate-200/80 dark:border-white/[0.06]";

export function OverviewStartupSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_36%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.06),transparent_32%),linear-gradient(135deg,rgba(248,250,252,0.98),transparent_44%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.18),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.14),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.025),transparent_48%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/10 blur-3xl dark:bg-accent-cyan/12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-cyan-200/35"
        aria-hidden
      />
    </>
  );
}
