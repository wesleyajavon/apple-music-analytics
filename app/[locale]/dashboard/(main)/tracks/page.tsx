"use client";

import { Suspense, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchTrackStats, trackKeys, useTrackStats } from "@/lib/hooks/use-tracks";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_TABLE,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_BADGE_CYAN,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN,
  DASHBOARD_SPOTLIGHT_BADGE_VIOLET,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_TABLE_HEAD,
  DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL,
  DASHBOARD_SPOTLIGHT_TABLE_ROW_HOVER,
  DASHBOARD_SPOTLIGHT_FOOTER,
  DASHBOARD_SPOTLIGHT_FOOTER_TEXT,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_SELECT,
  DASHBOARD_SPOTLIGHT_LABEL,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";
import type { TrackOverviewDto, TracksResponseDto, TrackStatsDto } from "@/lib/dto/track";
import { LineChart } from "lucide-react";

const TRACKS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-accent-cyan/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";
const MOBILE_DATE_OPTS = { month: "2-digit", day: "2-digit", year: "2-digit" } as const;

function TracksHeroFrame({
  trendsHref,
  stats,
  badgeLabel,
}: {
  trendsHref: string;
  stats: ReactNode;
  badgeLabel: string;
}) {
  const t = useTranslations("tracks");
  return (
    <div className={TRACKS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.24),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(139,92,246,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(15,23,42,0.9)_48%,rgba(6,78,59,0.5))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-cyan/20 blur-3xl" />
      <div className="absolute -bottom-28 right-8 h-72 w-72 rounded-full bg-accent-emerald/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={trendsHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <LineChart className="h-4 w-4" aria-hidden />
              {t("viewTrends")}
            </Link>
            <span className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur">
              {badgeLabel}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-cyan-100">{t("heroStatTag")}</span>
              </div>
              {stats}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TracksHeroStats({ overview, locale }: { overview: TrackOverviewDto; locale: string }) {
  const t = useTranslations("tracks");
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{overview.totalTracks.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("tracks")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white">{overview.totalListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("listens")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:col-span-1">
        <p className="text-xl font-semibold tracking-tight text-white">{overview.topTrackListenCount.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("topTrack")}</p>
      </div>
    </div>
  );
}

function TracksHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-20 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function TracksSectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function TracksChartSkeleton() {
  return (
    <div className="h-[520px] min-w-[320px] rounded-[1.35rem] border border-slate-200/80 bg-slate-100/50 p-5 dark:border-white/10 dark:bg-black/30">
      <div className="flex h-full flex-col justify-between">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-3 w-28 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
            <div
              className="h-5 rounded-r-lg bg-cyan-200/50 animate-shimmer dark:bg-cyan-400/20"
              style={{ width: `${35 + ((index * 11) % 55)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TracksTableRowsSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <tr key={`skeleton-${index}`} className="border-b border-slate-100 dark:border-white/5">
          <td className="whitespace-nowrap px-5 py-4">
            <div className="h-4 w-8 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-40 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-32 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
          </td>
          <td className="whitespace-nowrap px-5 py-4">
            <div className="ml-auto h-4 w-16 rounded bg-slate-200/90 animate-shimmer dark:bg-white/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

type MobileTrackStat = {
  label: string;
  value: string;
  description: string;
};

function MobileTracksLoadingFallback({
  badgeLabel,
  trendsHref,
}: {
  badgeLabel: string;
  trendsHref: string;
}) {
  const t = useTranslations("tracks");
  return (
    <div className="space-y-5 lg:hidden">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-accent-cyan/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(45,212,191,0.18),transparent_34%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
              {t("mobile.heroEyebrow")}
            </p>
            <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold">
              {badgeLabel}
            </span>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-white/15" />
            <div className="h-8 w-11/12 animate-pulse rounded bg-white/20" />
            <div className="h-4 w-8/12 animate-pulse rounded bg-white/10" />
          </div>
          <Link
            href={trendsHref}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-gray-950"
          >
            {t("viewTrends")}
          </Link>
        </div>
      </section>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[0, 1, 2].map((index) => (
          <div key={index} className="min-w-[9.5rem] rounded-3xl border border-card-border bg-white/80 p-4 shadow-card dark:border-white/10 dark:bg-slate-950">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/15" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileTracksHero({
  topTrack,
  overview,
  badgeLabel,
  trendsHref,
  locale,
}: {
  topTrack: TrackStatsDto;
  overview: TrackOverviewDto;
  badgeLabel: string;
  trendsHref: string;
  locale: string;
}) {
  const t = useTranslations("tracks");
  const share = overview.totalListens > 0 ? (topTrack.listenCount / overview.totalListens) * 100 : 0;
  const formattedShare = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(share);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-accent-cyan/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.24),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(45,212,191,0.20),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(15,23,42,0.92)_48%,rgba(6,78,59,0.56))]" />
      <div className="absolute -bottom-24 right-4 h-56 w-56 rounded-full bg-accent-emerald/20 blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
            {t("mobile.heroEyebrow")}
          </p>
          <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold text-white/85">
            {badgeLabel}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {t("mobile.primaryInsightEyebrow")}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.06em]">
            {topTrack.trackTitle}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {t("mobile.primaryInsightBody", { artist: topTrack.artistName })}
          </p>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("listens")}
              </p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.06em]">
                {topTrack.listenCount.toLocaleString(locale)}
              </p>
            </div>
            <div className="max-w-[8rem] text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("mobile.shareLabel")}
              </p>
              <p className="mt-1 text-lg font-semibold text-cyan-100">
                {formattedShare}%
              </p>
            </div>
          </div>
        </div>

        <Link
          href={trendsHref}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
        >
          <LineChart className="h-4 w-4" aria-hidden />
          {t("mobile.trendsCta")}
        </Link>
      </div>
    </section>
  );
}

function MobileTracksMetricRail({ stats }: { stats: MobileTrackStat[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-white/85 p-4 shadow-card backdrop-blur dark:border-white/10 dark:bg-slate-950"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted dark:text-slate-400">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-foreground dark:text-white">
            {stat.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted dark:text-slate-400">
            {stat.description}
          </p>
        </article>
      ))}
    </div>
  );
}

function MobileTrackBarRow({
  track,
  rank,
  maxListens,
  totalListens,
  locale,
}: {
  track: TrackStatsDto;
  rank: number;
  maxListens: number;
  totalListens: number;
  locale: string;
}) {
  const t = useTranslations("tracks");
  const width = maxListens > 0 ? Math.max(8, Math.round((track.listenCount / maxListens) * 100)) : 8;
  const share = totalListens > 0 ? (track.listenCount / totalListens) * 100 : 0;
  const formattedShare = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(share);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-xs font-black text-white">
            {rank}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white" title={track.trackTitle}>
              {track.trackTitle}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400" title={track.artistName}>
              {track.artistName}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-white">
            {track.listenCount.toLocaleString(locale)}
          </p>
          <p className="text-[11px] text-slate-400">
            {formattedShare}% · {t("listensCount")}
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300"
          style={{ width: `${width}%` }}
        />
      </div>
    </article>
  );
}

function MobileTracksDisclosure({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-[1.75rem] border border-card-border bg-white/85 shadow-card backdrop-blur dark:border-white/[0.08] dark:bg-[#090b14]"
      open={defaultOpen}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
        <span>
          <span className="block text-sm font-semibold text-foreground dark:text-white">
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted dark:text-slate-400">
            {description}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-card-border bg-white/70 text-muted transition-transform group-open:rotate-90 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-slate-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-card-border px-4 py-4 dark:border-white/[0.08]">
        {children}
      </div>
    </details>
  );
}

function MobileTracksRanking({
  tracks,
  isFetching,
  pageSize,
  offset,
  locale,
}: {
  tracks: TrackStatsDto[];
  isFetching: boolean;
  pageSize: number;
  offset: number;
  locale: string;
}) {
  const t = useTranslations("tracks");
  if (isFetching) {
    return (
      <div className="space-y-2">
        {Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
          <div key={`mobile-ranking-skeleton-${index}`} className="rounded-2xl border border-card-border bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => (
        <article
          key={track.trackId}
          className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-card-border bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.05]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white dark:bg-white/[0.08]">
              {offset + index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground dark:text-white" title={track.trackTitle}>
                {track.trackTitle}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted dark:text-slate-400" title={track.artistName}>
                {track.artistName}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-foreground dark:text-white">
              {track.listenCount.toLocaleString(locale)}
            </p>
            <p className="text-[11px] text-muted dark:text-slate-400">{t("listensCount")}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function MobileTracksPagination({
  page,
  pageSize,
  totalPages,
  paginationSummary,
  hasMore,
  updatePaginationParams,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  paginationSummary: string;
  hasMore: boolean;
  updatePaginationParams: (nextPage: number, nextPageSize: number) => void;
}) {
  const t = useTranslations("tracks");
  return (
    <div className="space-y-3 rounded-3xl border border-card-border bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-center text-xs text-muted dark:text-slate-400">{paginationSummary}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => updatePaginationParams(page - 1, pageSize)}
          disabled={page === 1}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-card-border bg-white px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/10 dark:text-white"
        >
          {t("paginationPrevious")}
        </button>
        <button
          type="button"
          onClick={() => updatePaginationParams(page + 1, pageSize)}
          disabled={!hasMore}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-card-border bg-white px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/10 dark:text-white"
        >
          {t("paginationNext")}
        </button>
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-white px-3 dark:border-white/10 dark:bg-white/[0.05]">
        <span className="text-xs font-medium text-muted dark:text-slate-400">
          {t("paginationPage", { page, totalPages })}
        </span>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-muted dark:text-slate-300">
          <span>{t("pageSizeLabel")}</span>
          <select
            value={pageSize}
            onChange={(e) => updatePaginationParams(1, Number(e.target.value))}
            className="min-h-9 rounded-xl border border-card-border bg-white px-2 text-sm font-semibold text-foreground dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function MobileTracksFlow({
  topData,
  pagedData,
  pagedTracks,
  isPagedFetching,
  page,
  pageSize,
  offset,
  pageStart,
  pageEnd,
  totalTracksInRange,
  totalPages,
  trendsHref,
  badgeLabel,
  locale,
  updatePaginationParams,
}: {
  topData: TracksResponseDto;
  pagedData?: TracksResponseDto;
  pagedTracks: TrackStatsDto[];
  isPagedFetching: boolean;
  page: number;
  pageSize: number;
  offset: number;
  pageStart: number;
  pageEnd: number;
  totalTracksInRange: number;
  totalPages: number;
  trendsHref: string;
  badgeLabel: string;
  locale: string;
  updatePaginationParams: (nextPage: number, nextPageSize: number) => void;
}) {
  const t = useTranslations("tracks");
  const topTrack = topData.topTracks[0];
  const maxListens = topData.topTracks[0]?.listenCount ?? 0;
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const stats: MobileTrackStat[] = [
    {
      label: t("tracks"),
      value: topData.overview.totalTracks.toLocaleString(locale),
      description: t("mobile.stats.uniqueTracks"),
    },
    {
      label: t("listens"),
      value: topData.overview.totalListens.toLocaleString(locale),
      description: t("mobile.stats.totalListens"),
    },
    {
      label: t("mobile.stats.averageLabel"),
      value: numberFormatter.format(topData.overview.averageListensPerTrack),
      description: t("mobile.stats.average"),
    },
  ];
  const paginationSummary = t("paginationSummary", {
    start: pageStart,
    end: pageEnd,
    total: totalTracksInRange,
  });

  if (!topTrack) return null;

  return (
    <div className="space-y-5 lg:hidden">
      <MobileTracksHero
        topTrack={topTrack}
        overview={topData.overview}
        badgeLabel={badgeLabel}
        trendsHref={trendsHref}
        locale={locale}
      />

      <MobileTracksMetricRail stats={stats} />

      <section className="rounded-[1.75rem] bg-slate-950 p-3 shadow-2xl shadow-black/15">
        <div className="px-1 pb-3 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
            {t("mobile.topFiveEyebrow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
            {t("mobile.topFiveTitle")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {t("mobile.topFiveDescription")}
          </p>
        </div>
        <div className="space-y-2">
          {topData.topTracks.slice(0, 5).map((track, index) => (
            <MobileTrackBarRow
              key={track.trackId}
              track={track}
              rank={index + 1}
              maxListens={maxListens}
              totalListens={topData.overview.totalListens}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <div className="space-y-3">
        {topData.topTracks.length > 5 ? (
          <MobileTracksDisclosure
            title={t("mobile.disclosures.top20.title")}
            description={t("mobile.disclosures.top20.description")}
          >
            <div className="space-y-2 rounded-3xl bg-slate-950 p-3">
              {topData.topTracks.slice(5, 20).map((track, index) => (
                <MobileTrackBarRow
                  key={track.trackId}
                  track={track}
                  rank={index + 6}
                  maxListens={maxListens}
                  totalListens={topData.overview.totalListens}
                  locale={locale}
                />
              ))}
            </div>
          </MobileTracksDisclosure>
        ) : null}

        <MobileTracksDisclosure
          title={t("mobile.disclosures.ranking.title")}
          description={t("mobile.disclosures.ranking.description")}
        >
          <div className="space-y-3">
            <MobileTracksRanking
              tracks={pagedTracks}
              isFetching={isPagedFetching || !pagedData}
              pageSize={pageSize}
              offset={offset}
              locale={locale}
            />
            {pagedData?.pagination ? (
              <MobileTracksPagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                paginationSummary={paginationSummary}
                hasMore={pagedData.pagination.hasMore}
                updatePaginationParams={updatePaginationParams}
              />
            ) : null}
          </div>
        </MobileTracksDisclosure>
      </div>
    </div>
  );
}

function useTracksTrendsHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("pageSize");
    const qs = params.toString();
    return qs ? `/dashboard/tracks/trends?${qs}` : "/dashboard/tracks/trends";
  }, [searchParams]);
}

function useTracksBadgeLabel() {
  const locale = useLocale();
  const tOverview = useTranslations("overview");
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  return dateRangeLabel || tOverview("allData");
}

function useTracksMobileBadgeLabel() {
  const locale = useLocale();
  const tOverview = useTranslations("overview");
  const { startDate, endDate } = useListenDateRange();
  if (!startDate || !endDate) return tOverview("allData");

  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(locale, MOBILE_DATE_OPTS)}–${end.toLocaleDateString(locale, MOBILE_DATE_OPTS)}`;
}

function TracksPageFallback() {
  const trendsHref = useTracksTrendsHref();
  const badgeLabel = useTracksBadgeLabel();
  const mobileBadgeLabel = useTracksMobileBadgeLabel();
  return (
    <>
      <MobileTracksLoadingFallback badgeLabel={mobileBadgeLabel} trendsHref={trendsHref} />
      <div className="hidden space-y-8 lg:block">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={<TracksHeroStatsSkeleton />} />
        <OverviewSkeleton />
      </div>
    </>
  );
}

function TracksContent() {
  const DEFAULT_PAGE_SIZE = 20;
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("tracks");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const badgeLabel = useTracksBadgeLabel();
  const mobileBadgeLabel = useTracksMobileBadgeLabel();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = [20, 50, 100].includes(
    Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
  )
    ? Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const updatePaginationParams = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(Math.max(1, nextPage)));
      params.set("pageSize", String(nextPageSize));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const {
    data: topData,
    isLoading: isTopLoading,
    error: topError,
    refetch: refetchTop,
  } = useTrackStats(startDate, endDate, userId, 20, 0);
  const {
    data: pagedData,
    isLoading: isPagedLoading,
    isFetching: isPagedFetching,
    error: pagedError,
    refetch: refetchPaged,
  } = useTrackStats(startDate, endDate, userId, pageSize, offset);

  const topTracks = useMemo(() => topData?.topTracks ?? [], [topData?.topTracks]);
  const pagedTracks = useMemo(() => pagedData?.topTracks ?? [], [pagedData?.topTracks]);
  const pagination = pagedData?.pagination;
  const totalTracksInRange = pagination?.total ?? 0;
  const pageStart = totalTracksInRange === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + pagedTracks.length, totalTracksInRange);
  const totalPages = Math.max(1, Math.ceil(totalTracksInRange / pageSize));
  const trendsHref = useTracksTrendsHref();

  useEffect(() => {
    if (page > totalPages) {
      updatePaginationParams(totalPages, pageSize);
    }
  }, [page, pageSize, totalPages, updatePaginationParams]);

  useEffect(() => {
    if (!pagination?.hasMore) return;
    const nextOffset = offset + pageSize;
    void queryClient.prefetchQuery({
      queryKey: trackKeys.stats({
        startDate,
        endDate,
        userId,
        limit: pageSize,
        offset: nextOffset,
      }),
      queryFn: () => fetchTrackStats(startDate, endDate, userId, pageSize, nextOffset),
    });
  }, [endDate, offset, pageSize, pagination?.hasMore, queryClient, startDate, userId]);

  const chartData = useMemo(
    () =>
      topTracks.slice(0, 20).map((track) => ({
        name: track.trackTitle.length > 24 ? `${track.trackTitle.slice(0, 24)}...` : track.trackTitle,
        fullName: `${track.trackTitle} - ${track.artistName}`,
        listens: track.listenCount,
      })),
    [topTracks]
  );

  const heroStats = topData ? (
    <TracksHeroStats overview={topData.overview} locale={locale} />
  ) : (
    <TracksHeroStatsSkeleton />
  );

  if (!isTopLoading && topError && !topData) {
    return (
      <div className="space-y-12">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={null} />
        <ErrorState variant="startup" error={topError} message={t("errorLoading")} onRetry={refetchTop} />
      </div>
    );
  }
  if (!isTopLoading && (!topData || topData.topTracks.length === 0)) {
    return (
      <div className="space-y-12">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={null} />
        <EmptyState variant="startup" {...emptyStatePresets.importData} />
      </div>
    );
  }
  if (isTopLoading || !topData) {
    return <TracksPageFallback />;
  }
  if (!isPagedLoading && pagedError && !pagedData) {
    return (
      <div className="space-y-12">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={heroStats} />
        <ErrorState variant="startup" error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
      </div>
    );
  }

  return (
    <>
      <MobileTracksFlow
        topData={topData}
        pagedData={pagedData}
        pagedTracks={pagedTracks}
        isPagedFetching={isPagedFetching}
        page={page}
        pageSize={pageSize}
        offset={offset}
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalTracksInRange={totalTracksInRange}
        totalPages={totalPages}
        trendsHref={trendsHref}
        badgeLabel={mobileBadgeLabel}
        locale={locale}
        updatePaginationParams={updatePaginationParams}
      />

      <div className="hidden space-y-12 lg:block">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={heroStats} />

        <section className="relative animate-fade-in-up">
          <TracksSectionHeader
            eyebrow={t("sections.chart.eyebrow")}
            title={t("sections.chart.title")}
            description={t("sections.chart.description")}
          />
          <div className={DASHBOARD_SPOTLIGHT_SHELL}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-accent-cyan/8 blur-3xl dark:bg-accent-cyan/12" aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
            <div className="relative px-5 py-6 sm:px-8 sm:py-8">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className={DASHBOARD_SPOTLIGHT_BADGE_CYAN}>
                    <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN} />
                    {t("sections.chart.badge")}
                  </div>
                  <p className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {topData
                      ? `${topData.overview.totalListens.toLocaleString(locale)} ${t("listensCount")} · ${t("top20Listens")}`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
                {isTopLoading || !topData ? (
                  <TracksChartSkeleton />
                ) : (
                  <ChartResponsiveContainer token="tracksMain">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 148, bottom: 8 }}>
                      <defs>
                        <linearGradient id="trackBarGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="45%" stopColor="#2dd4bf" />
                          <stop offset="78%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#a7f3d0" />
                        </linearGradient>
                        <filter id="trackBarGlow" x="-20%" y="-35%" width="150%" height="170%">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#22d3ee" floodOpacity="0.2" />
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                      <XAxis type="number" tick={{ fill: chartTheme.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: chartTheme.tickStrong, fontSize: 12, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={136}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                        labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                        itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                        formatter={(value: number, name: string, props: { payload?: { fullName?: string } }) => {
                          const fullName = props?.payload?.fullName ?? t("track");
                          if (name === "listens") return [`${value.toLocaleString(locale)} ${t("listensCount")}`, fullName];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="listens" fill="url(#trackBarGradient)" filter="url(#trackBarGlow)" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ChartResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="relative animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <TracksSectionHeader
            eyebrow={t("sections.table.eyebrow")}
            title={t("sections.table.title")}
            description={t("sections.table.description")}
          />
          <div className={DASHBOARD_SPOTLIGHT_SHELL}>
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_TABLE} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
            <div className={`relative ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-5 sm:px-8`}>
              <div className={DASHBOARD_SPOTLIGHT_BADGE_VIOLET}>
                <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_VIOLET} />
                {t("sections.table.badge")}
              </div>
            </div>
            <div className="relative hidden max-h-[min(70vh,640px)] overflow-x-auto overflow-y-auto lg:block">
              <table className="min-w-full divide-y divide-slate-200/90 dark:divide-white/10">
                <thead className={DASHBOARD_SPOTLIGHT_TABLE_HEAD}>
                  <tr>
                    <th scope="col" className={`px-5 py-3 text-left ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                      {t("rank")}
                    </th>
                    <th scope="col" className={`px-5 py-3 text-left ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                      {t("track")}
                    </th>
                    <th scope="col" className={`px-5 py-3 text-left ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                      {t("artist")}
                    </th>
                    <th scope="col" className={`px-5 py-3 text-right ${DASHBOARD_SPOTLIGHT_TABLE_HEAD_CELL}`}>
                      {t("listens")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {isPagedFetching || !pagedData ? (
                    <TracksTableRowsSkeleton count={Math.min(pageSize, 10)} />
                  ) : (
                    pagedTracks.map((track, index) => (
                      <tr key={track.trackId} className={DASHBOARD_SPOTLIGHT_TABLE_ROW_HOVER}>
                        <td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-slate-500 dark:text-slate-400">{offset + index + 1}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900 dark:text-white">{track.trackTitle}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400">{track.artistName}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {track.listenCount.toLocaleString(locale)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {pagination ? (
              <div className={DASHBOARD_SPOTLIGHT_FOOTER}>
                <p className={DASHBOARD_SPOTLIGHT_FOOTER_TEXT}>
                  {t("paginationSummary", {
                    start: pageStart,
                    end: pageEnd,
                    total: totalTracksInRange,
                  })}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updatePaginationParams(page - 1, pageSize)}
                    disabled={page === 1}
                    className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
                  >
                    {t("paginationPrevious")}
                  </button>
                  <label className={DASHBOARD_SPOTLIGHT_LABEL}>
                    <span>{t("pageSizeLabel")}</span>
                    <select
                      value={pageSize}
                      onChange={(e) => updatePaginationParams(1, Number(e.target.value))}
                      className={DASHBOARD_SPOTLIGHT_SELECT}
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                  <span className={`px-2 ${DASHBOARD_SPOTLIGHT_FOOTER_TEXT}`}>
                    {t("paginationPage", { page, totalPages })}
                  </span>
                  <button
                    type="button"
                    onClick={() => updatePaginationParams(page + 1, pageSize)}
                    disabled={!pagination.hasMore}
                    className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
                  >
                    {t("paginationNext")}
                  </button>
                </div>
              </div>
            ) : null}
            {isPagedFetching ? <div className="px-5 pb-4 text-xs text-slate-500 dark:text-slate-500 sm:px-8">{t("paginationLoading")}</div> : null}
          </div>
        </section>
      </div>
    </>
  );
}

export default function TracksPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<TracksPageFallback />}>
        <TracksContent />
      </Suspense>
    </div>
  );
}
