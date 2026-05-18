/**
 * Shell visuel partagé pour les cartes « startup » du dashboard overview
 * (gradients, bords arrondis, lien d’action) — aligné sur le bloc timeline / momentum.
 */

export const OVERVIEW_STARTUP_SURFACE_BASE =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/30";

export const OVERVIEW_STARTUP_EYEBROW_PILL_CLASS =
  "mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100";

export const OVERVIEW_STARTUP_HEADER_LINK_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15";

export const OVERVIEW_STARTUP_INNER_PANEL_CLASS =
  "rounded-[1.5rem] border border-white/10 bg-black/20 p-3 shadow-2xl shadow-black/20 backdrop-blur sm:p-5";

export function OverviewStartupSurfaceBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.26),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
        aria-hidden
      />
    </>
  );
}
