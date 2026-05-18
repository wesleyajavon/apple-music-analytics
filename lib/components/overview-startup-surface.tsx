/**
 * Shell visuel partagé pour les cartes « startup » du dashboard overview
 * (gradients, bords arrondis, lien d’action) — aligné sur le bloc timeline / momentum.
 */

export const OVERVIEW_STARTUP_SURFACE_BASE =
  "relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white text-slate-900 shadow-xl shadow-slate-900/[0.06] ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-2xl dark:shadow-black/20 dark:ring-0 dark:hover:shadow-black/30";

export const OVERVIEW_STARTUP_EYEBROW_PILL_CLASS =
  "mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200/90 bg-cyan-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100";

export const OVERVIEW_STARTUP_HEADER_LINK_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:shadow-none dark:hover:bg-white/15";

export const OVERVIEW_STARTUP_INNER_PANEL_CLASS =
  "rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-3 shadow-inner shadow-slate-900/[0.04] backdrop-blur sm:p-5 dark:border-white/10 dark:bg-black/20 dark:shadow-2xl dark:shadow-black/20";

export function OverviewStartupSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_36%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.06),transparent_32%),linear-gradient(135deg,rgba(248,250,252,0.98),transparent_44%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.26),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/10 blur-3xl dark:bg-accent-cyan/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-cyan-200/50"
        aria-hidden
      />
    </>
  );
}
