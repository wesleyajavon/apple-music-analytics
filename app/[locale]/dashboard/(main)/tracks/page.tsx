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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchTrackStats, trackKeys, useTrackStats } from "@/lib/hooks/use-tracks";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import type { TrackOverviewDto } from "@/lib/dto/track";
import { ListMusic } from "lucide-react";

const TRACK_RAIL_CLASS = "bg-gradient-to-r from-cyan-300 via-emerald-400 to-lime-300";
const TRACK_PANEL_CLASS =
  "relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card transition-shadow duration-300 hover:shadow-card-hover dark:border-cyan-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]";

const TRACKS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.34),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#063b36_100%)] px-6 py-8 shadow-2xl shadow-emerald-950/40 sm:px-8 sm:py-10";

const TRENDS_CTA_CLASS =
  "inline-flex min-h-[44px] w-fit shrink-0 items-center justify-center rounded-full border border-cyan-100/30 bg-white/95 px-5 py-2.5 text-sm font-semibold text-cyan-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

function TracksHeroFrame({ trendsHref, stats }: { trendsHref: string; stats: ReactNode }) {
  const t = useTranslations("tracks");
  return (
    <div className={TRACKS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.11)_1px,_transparent_1px),linear-gradient(90deg,_rgba(132,204,22,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-lime-300/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/18 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TRACK_RAIL_CLASS} opacity-90`} />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <ListMusic className="h-9 w-9 shrink-0 text-cyan-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${TRACK_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(34,211,238,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-cyan-100/90 sm:text-lg">{t("subtitle")}</p>
          {stats}
        </div>
        <Link href={trendsHref} className={TRENDS_CTA_CLASS}>
          {t("viewTrends")}
        </Link>
      </div>
    </div>
  );
}

function TracksHeroStats({ overview, locale }: { overview: TrackOverviewDto; locale: string }) {
  const t = useTranslations("tracks");
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-cyan-300/20 bg-slate-950/35 px-4 py-3 shadow-lg shadow-cyan-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-cyan-100/80">{t("tracks")}</p>
        <p className="text-2xl font-bold text-white">{overview.totalTracks.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-emerald-300/20 bg-slate-950/35 px-4 py-3 shadow-lg shadow-emerald-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/80">{t("listens")}</p>
        <p className="text-2xl font-bold text-white">{overview.totalListens.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-lime-300/20 bg-slate-950/35 px-4 py-3 shadow-lg shadow-lime-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-lime-100/80">{t("topTrack")}</p>
        <p className="text-2xl font-bold text-white">{overview.topTrackListenCount.toLocaleString(locale)}</p>
      </div>
    </div>
  );
}

function TracksHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-20 rounded bg-white/15" />
          <div className="h-8 w-24 rounded bg-white/20" />
        </div>
      ))}
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

function TracksPageFallback() {
  const trendsHref = useTracksTrendsHref();
  return (
    <div className="space-y-8">
      <TracksHeroFrame trendsHref={trendsHref} stats={<TracksHeroStatsSkeleton />} />
      <OverviewSkeleton />
    </div>
  );
}

function TracksContent() {
  const DEFAULT_PAGE_SIZE = 20;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("tracks");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
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
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const {
    data: topData,
    isLoading: isTopLoading,
    error: topError,
    refetch: refetchTop,
  } = useTrackStats(
    startDate,
    endDate,
    userId,
    20,
    0
  );
  const {
    data: pagedData,
    isLoading: isPagedLoading,
    isFetching: isPagedFetching,
    error: pagedError,
    refetch: refetchPaged,
  } = useTrackStats(
    startDate,
    endDate,
    userId,
    pageSize,
    offset
  );

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
  }, [
    endDate,
    offset,
    pageSize,
    pagination?.hasMore,
    queryClient,
    startDate,
    userId,
  ]);
  const chartData = useMemo(
    () =>
      topTracks.slice(0, 20).map((track) => ({
        name: track.trackTitle.length > 24 ? `${track.trackTitle.slice(0, 24)}...` : track.trackTitle,
        fullName: `${track.trackTitle} - ${track.artistName}`,
        listens: track.listenCount,
      })),
    [topTracks]
  );

  if (isTopLoading) {
    return (
      <div className="space-y-8">
        <TracksHeroFrame trendsHref={trendsHref} stats={<TracksHeroStatsSkeleton />} />
        <OverviewSkeleton />
      </div>
    );
  }
  if (topError) {
    return (
      <div className="space-y-8">
        <TracksHeroFrame trendsHref={trendsHref} stats={null} />
        <ErrorState error={topError} message={t("errorLoading")} onRetry={refetchTop} />
      </div>
    );
  }
  if (!topData || topData.topTracks.length === 0) {
    return (
      <div className="space-y-8">
        <TracksHeroFrame trendsHref={trendsHref} stats={null} />
        <EmptyState {...emptyStatePresets.importData} />
      </div>
    );
  }
  if (isPagedLoading && !pagedData) {
    return (
      <div className="space-y-8">
        <TracksHeroFrame
          trendsHref={trendsHref}
          stats={<TracksHeroStats overview={topData.overview} locale={locale} />}
        />
        <OverviewSkeleton />
      </div>
    );
  }
  if (pagedError) {
    return (
      <div className="space-y-8">
        <TracksHeroFrame
          trendsHref={trendsHref}
          stats={<TracksHeroStats overview={topData.overview} locale={locale} />}
        />
        <ErrorState error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
      </div>
    );
  }
  if (!pagedData) {
    return (
      <div className="space-y-8">
        <TracksHeroFrame
          trendsHref={trendsHref}
          stats={<TracksHeroStats overview={topData.overview} locale={locale} />}
        />
        <EmptyState {...emptyStatePresets.importData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <TracksHeroFrame
        trendsHref={trendsHref}
        stats={<TracksHeroStats overview={topData.overview} locale={locale} />}
      />

      <section className={`${TRACK_PANEL_CLASS} animate-fade-in-up`}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TRACK_RAIL_CLASS} opacity-80`} />
        <div className="border-b border-cyan-200/20 px-6 py-4 dark:border-cyan-300/10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("top20Listens")}</h3>
          <p className="mt-0.5 text-sm text-cyan-700/80 dark:text-cyan-100/70">
            {topData.overview.totalListens.toLocaleString(locale)} {t("listensCount")}
          </p>
        </div>
        <div className="relative overflow-x-auto p-6">
          <div className="pointer-events-none absolute right-12 top-12 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/15" />
          <div className="relative min-w-[360px] rounded-2xl border border-cyan-200/20 bg-white/50 p-3 shadow-inner dark:border-cyan-300/10 dark:bg-slate-950/20">
          <ResponsiveContainer width="100%" height={560}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <defs>
                <linearGradient id="trackBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="45%" stopColor="#2dd4bf" />
                  <stop offset="78%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#bef264" />
                </linearGradient>
                <filter id="trackBarGlow" x="-20%" y="-35%" width="150%" height="170%">
                  <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#22d3ee" floodOpacity="0.24" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#67e8f9" strokeOpacity={0.24} horizontal={false} />
              <XAxis type="number" tick={{ fill: "#0891b2", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#0f766e", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={140} />
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
              <Bar dataKey="listens" fill="url(#trackBarGradient)" filter="url(#trackBarGlow)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className={`${TRACK_PANEL_CLASS} animate-fade-in-up`} style={{ animationDelay: "60ms" }}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TRACK_RAIL_CLASS} opacity-80`} />
        <div className="border-b border-cyan-200/20 px-6 py-4 dark:border-cyan-300/10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("allTracks")}</h3>
          <p className="mt-0.5 text-sm text-cyan-700/80 dark:text-cyan-100/70">
            {t("heroSubtitle")}
          </p>
        </div>
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="sticky top-0 z-10 bg-cyan-50/95 backdrop-blur supports-[backdrop-filter]:bg-cyan-50/80 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("rank")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("track")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("artist")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("listens")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isPagedFetching
                ? Array.from({ length: Math.min(pageSize, 10) }).map((_, index) => (
                    <tr key={`skeleton-${index}`}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
                : pagedTracks.map((track, index) => (
                    <tr key={track.trackId} className="transition-colors hover:bg-cyan-50/70 dark:hover:bg-cyan-950/20">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{offset + index + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{track.trackTitle}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{track.artistName}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                        {track.listenCount.toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {pagination ? (
          <div className="flex flex-col gap-3 border-t border-cyan-200/20 bg-cyan-50/30 px-6 py-4 dark:border-cyan-400/10 dark:bg-cyan-950/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cyan-900/70 dark:text-cyan-100/75">
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
                className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-cyan-200/60 bg-white/90 px-3 py-1.5 text-sm font-medium text-cyan-950 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-500/25 dark:bg-slate-900/60 dark:text-cyan-50 dark:hover:bg-cyan-950/40"
              >
                {t("paginationPrevious")}
              </button>
              <label className="ml-2 inline-flex items-center gap-2 text-sm text-cyan-900/80 dark:text-cyan-100/80">
                <span>{t("pageSizeLabel")}</span>
                <select
                  value={pageSize}
                  onChange={(e) => updatePaginationParams(1, Number(e.target.value))}
                  className="rounded-lg border border-cyan-200/60 bg-white px-2 py-1 text-sm text-cyan-950 dark:border-cyan-500/25 dark:bg-slate-900 dark:text-cyan-50"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <span className="px-2 text-sm text-cyan-900/80 dark:text-cyan-100/80">
                {t("paginationPage", { page, totalPages })}
              </span>
              <button
                type="button"
                onClick={() => updatePaginationParams(page + 1, pageSize)}
                disabled={!pagination.hasMore}
                className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-cyan-200/60 bg-white/90 px-3 py-1.5 text-sm font-medium text-cyan-950 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-500/25 dark:bg-slate-900/60 dark:text-cyan-50 dark:hover:bg-cyan-950/40"
              >
                {t("paginationNext")}
              </button>
            </div>
          </div>
        ) : null}
        {isPagedFetching ? (
          <div className="px-6 pb-4 text-xs text-cyan-800/70 dark:text-cyan-200/60">{t("paginationLoading")}</div>
        ) : null}
      </section>
    </div>
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
