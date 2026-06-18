"use client";

import { Link } from "@/i18n/navigation";
import { LiveStatusDot } from "@/lib/components/live-status-dot";

type LibraryLeaderAccent = {
  badge: string;
  rail: string;
  glow: string;
  progress: string;
  text: string;
  soft: string;
  border: string;
  liveDot: "cyan" | "violet" | "pink";
  cardGradient: string;
  headerLine: string;
  cardBorder: string;
};

export type LibraryLeaderItem = {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  percentage: number;
};

export const LIBRARY_LEADER_ACCENTS = {
  tracks: {
    badge: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    rail: "via-cyan-300/70",
    glow: "bg-cyan-300/18",
    progress: "from-cyan-300 via-emerald-400 to-lime-300",
    text: "text-cyan-100",
    soft: "bg-cyan-300/10",
    border: "border-cyan-300/25",
    liveDot: "cyan",
    cardGradient:
      "bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.22),transparent_34%),radial-gradient(circle_at_92%_8%,rgba(52,211,153,0.14),transparent_30%)]",
    headerLine: "via-cyan-300/50",
    cardBorder: "border-cyan-300/15",
  },
  artists: {
    badge: "border-violet-300/25 bg-violet-300/10 text-violet-100",
    rail: "via-violet-300/70",
    glow: "bg-violet-300/18",
    progress: "from-violet-400 via-cyan-300 to-lime-300",
    text: "text-violet-100",
    soft: "bg-violet-300/10",
    border: "border-violet-300/25",
    liveDot: "violet",
    cardGradient:
      "bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.24),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.16),transparent_32%)]",
    headerLine: "via-violet-300/50",
    cardBorder: "border-violet-300/15",
  },
  genres: {
    badge: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    rail: "via-rose-300/70",
    glow: "bg-rose-300/18",
    progress: "from-indigo-400 via-rose-400 to-amber-300",
    text: "text-rose-100",
    soft: "bg-rose-300/10",
    border: "border-rose-300/25",
    liveDot: "pink",
    cardGradient:
      "bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.22),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.12),transparent_32%)]",
    headerLine: "via-rose-300/50",
    cardBorder: "border-rose-300/15",
  },
} satisfies Record<string, LibraryLeaderAccent>;

function formatRank(index: number) {
  return String(index + 1).padStart(2, "0");
}

function TopLibraryFeaturedRow({
  item,
  accent,
  locale,
  listensLabel,
}: {
  item: LibraryLeaderItem;
  accent: LibraryLeaderAccent;
  locale: string;
  listensLabel: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.35rem] border ${accent.border} bg-white/[0.07] p-4 shadow-lg shadow-black/20 backdrop-blur`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full ${accent.glow} blur-2xl`}
        aria-hidden
      />
      <div
        className={`absolute inset-y-3 left-0 w-1 rounded-full bg-gradient-to-b ${accent.progress}`}
        aria-hidden
      />
      <div className="relative pl-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              #{formatRank(0)}
            </p>
            <p className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-white" title={item.title}>
              {item.title}
            </p>
            {item.subtitle ? (
              <p className="mt-1 truncate text-sm text-slate-400" title={item.subtitle}>
                {item.subtitle}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.05em] text-white">
              {item.count.toLocaleString(locale)}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {listensLabel}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${accent.progress} shadow-[0_0_12px_rgba(255,255,255,0.25)]`}
              style={{ width: "100%" }}
            />
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${accent.badge}`}
          >
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function TopLibraryRow({
  item,
  index,
  maxCount,
  accent,
  locale,
  listensLabel,
}: {
  item: LibraryLeaderItem;
  index: number;
  maxCount: number;
  accent: LibraryLeaderAccent;
  locale: string;
  listensLabel: string;
}) {
  if (index === 0) {
    return (
      <TopLibraryFeaturedRow
        item={item}
        accent={accent}
        locale={locale}
        listensLabel={listensLabel}
      />
    );
  }

  const widthPercent = maxCount > 0 ? Math.max(6, (item.count / maxCount) * 100) : 0;

  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] font-mono text-[11px] font-bold text-slate-300">
            {formatRank(index)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white/90" title={item.title}>
              {item.title}
            </p>
            {item.subtitle ? (
              <p className="mt-0.5 truncate text-xs text-slate-500" title={item.subtitle}>
                {item.subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-white">
            {item.count.toLocaleString(locale)}
          </p>
          <p className="text-[11px] text-slate-500">
            {item.percentage.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${accent.progress} opacity-80 transition-all duration-500 ease-out group-hover:opacity-100`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

export function TopLibraryCard({
  title,
  description,
  href,
  accent,
  items,
  locale,
  listensLabel,
  ctaLabel,
}: {
  title: string;
  description: string;
  href: string;
  accent: LibraryLeaderAccent;
  items: LibraryLeaderItem[];
  locale: string;
  listensLabel: string;
  ctaLabel: string;
}) {
  const maxCount = items[0]?.count ?? 1;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border ${accent.cardBorder} bg-slate-950 text-white shadow-2xl shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/35`}
    >
      <div className={`pointer-events-none absolute inset-0 ${accent.cardGradient}`} aria-hidden />
      <div
        className={`pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full ${accent.glow} blur-3xl`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent ${accent.headerLine} to-transparent`}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] backdrop-blur ${accent.badge}`}
              >
                <LiveStatusDot tone={accent.liveDot} />
                {title}
              </div>
              <p className="text-sm leading-6 text-slate-300">{description}</p>
            </div>
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              {ctaLabel}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          {items.map((item, index) => (
            <TopLibraryRow
              key={item.id}
              item={item}
              index={index}
              maxCount={maxCount}
              accent={accent}
              locale={locale}
              listensLabel={listensLabel}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
