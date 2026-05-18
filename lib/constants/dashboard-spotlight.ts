/**
 * Shells pour cartes analytics sous le hero (graphiques, tableaux).
 * Light : carte « papier » proche du style startup / Vercel.
 * Dark : spotlight slate conservé (inchangé visuellement).
 */

export const DASHBOARD_SPOTLIGHT_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white text-slate-900 shadow-xl shadow-slate-900/[0.06] ring-1 ring-black/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-2xl dark:shadow-black/25 dark:ring-0 dark:hover:shadow-black/35";

/** Gradient violet + cyan (bar chart / default spotlight) */
export const DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.07),transparent_36%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,0.05),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.2),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,0.14),transparent_30%)]";

/** Variante lime + violet (pie / second chart) */
export const DASHBOARD_SPOTLIGHT_GRADIENT_LIME =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.08),transparent_36%),radial-gradient(circle_at_12%_70%,rgba(139,92,246,0.06),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(132,204,22,0.14),transparent_32%),radial-gradient(circle_at_12%_70%,rgba(139,92,246,0.12),transparent_34%)]";

/** Tracks : accent cyan-forward */
export const DASHBOARD_SPOTLIGHT_GRADIENT_CYAN =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.08),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(139,92,246,0.06),transparent_30%),linear-gradient(135deg,rgba(248,250,252,0.95),transparent_46%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(139,92,246,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]";

/** Table spotlight (violet + cyan depuis la droite) */
export const DASHBOARD_SPOTLIGHT_GRADIENT_TABLE =
  "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.07),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.05),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.12),transparent_34%)]";

export const DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET =
  "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-violet-200/45";

export const DASHBOARD_SPOTLIGHT_HAIRLINE_LIME =
  "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/50 to-transparent dark:via-lime-200/40";

export const DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN =
  "pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent dark:via-cyan-200/45";

export const DASHBOARD_SPOTLIGHT_HEADER_BOTTOM =
  "relative border-b border-slate-200/80 dark:border-white/10";

export const DASHBOARD_SPOTLIGHT_TITLE =
  "text-lg font-semibold text-slate-900 sm:text-xl dark:text-white";

export const DASHBOARD_SPOTLIGHT_MUTED =
  "text-sm text-slate-600 dark:text-slate-400";

export const DASHBOARD_SPOTLIGHT_BADGE_VIOLET =
  "inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-violet-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-800 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-100";

export const DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET =
  "h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.35)] dark:bg-violet-300 dark:shadow-[0_0_14px_rgba(167,139,250,0.55)]";

export const DASHBOARD_SPOTLIGHT_BADGE_LIME =
  "inline-flex items-center gap-2 rounded-full border border-lime-200/90 bg-lime-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-lime-900 dark:border-lime-300/25 dark:bg-lime-300/10 dark:text-lime-100";

export const DASHBOARD_SPOTLIGHT_BADGE_DOT_LIME =
  "h-2 w-2 rounded-full bg-lime-500 shadow-[0_0_12px_rgba(132,204,22,0.35)] dark:bg-lime-300 dark:shadow-[0_0_12px_rgba(190,242,100,0.45)]";

export const DASHBOARD_SPOTLIGHT_BADGE_CYAN =
  "mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200/90 bg-cyan-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100";

/** Même style sans marge bas (headers flex / table expand) */
export const DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT =
  "inline-flex items-center gap-2 rounded-full border border-cyan-200/90 bg-cyan-50/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100";

export const DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN =
  "h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.35)] dark:bg-cyan-300 dark:shadow-[0_0_14px_rgb(34_211_238_/0.45)]";

export const DASHBOARD_SPOTLIGHT_INNER_WELL =
  "rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 p-3 shadow-inner shadow-slate-900/[0.03] backdrop-blur-sm sm:p-5 dark:border-white/10 dark:bg-black/25 dark:shadow-none";

export const DASHBOARD_SPOTLIGHT_PILL_MUTED =
  "inline-flex w-fit items-center rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200";

export const DASHBOARD_SPOTLIGHT_TABLE_HEAD =
  "sticky top-0 z-10 border-b border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90";

export const DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL =
  "text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

export const DASHBOARD_SPOTLIGHT_TABLE_BODY_DIVIDE =
  "divide-y divide-slate-100 dark:divide-white/5";

export const DASHBOARD_SPOTLIGHT_TABLE_ROW_HOVER =
  "transition-colors hover:bg-slate-50/90 dark:hover:bg-white/[0.04]";

export const DASHBOARD_SPOTLIGHT_FOOTER =
  "relative flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-white/10 dark:bg-black/35 sm:flex-row sm:items-center sm:justify-between sm:px-8";

export const DASHBOARD_SPOTLIGHT_FOOTER_TEXT =
  "text-sm text-slate-600 dark:text-slate-400";

export const DASHBOARD_SPOTLIGHT_BTN_SECONDARY =
  "inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/10 dark:text-white dark:shadow-none dark:hover:bg-white/15";

export const DASHBOARD_SPOTLIGHT_SELECT =
  "rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-900 dark:border-white/15 dark:bg-white/10 dark:text-white";

export const DASHBOARD_SPOTLIGHT_LABEL =
  "ml-1 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300";

/** Couleurs Recharts selon le thème */
export const DASHBOARD_CHART_THEME = {
  light: {
    tick: "#64748b",
    tickStrong: "#334155",
    grid: "rgba(148,163,184,0.35)",
    axisStroke: "rgba(100,116,139,0.4)",
    legend: "#475569",
    pieStroke: "rgba(241,245,249,0.98)",
  },
  dark: {
    tick: "#94a3b8",
    tickStrong: "#e2e8f0",
    grid: "rgba(148,163,184,0.18)",
    axisStroke: "rgba(148,163,184,0.35)",
    legend: "#cbd5e1",
    pieStroke: "rgba(15,23,42,0.85)",
  },
} as const;
