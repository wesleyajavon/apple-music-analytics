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
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import type { TrackOverviewDto } from "@/lib/dto/track";
import { LineChart } from "lucide-react";

const TRACKS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-accent-cyan/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

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
    <div className="h-[520px] min-w-[320px] rounded-[1.35rem] border border-white/10 bg-black/30 p-5">
      <div className="flex h-full flex-col justify-between">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-3 w-28 rounded bg-white/10 animate-shimmer" />
            <div
              className="h-5 rounded-r-lg bg-cyan-400/20 animate-shimmer"
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
        <tr key={`skeleton-${index}`} className="border-b border-white/5">
          <td className="whitespace-nowrap px-5 py-4">
            <div className="h-4 w-8 rounded bg-white/10 animate-shimmer" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-40 rounded bg-white/10 animate-shimmer" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-32 rounded bg-white/10 animate-shimmer" />
          </td>
          <td className="whitespace-nowrap px-5 py-4">
            <div className="ml-auto h-4 w-16 rounded bg-white/10 animate-shimmer" />
          </td>
        </tr>
      ))}
    </>
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

function TracksPageFallback() {
  const trendsHref = useTracksTrendsHref();
  const badgeLabel = useTracksBadgeLabel();
  return (
    <div className="space-y-8">
      <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={<TracksHeroStatsSkeleton />} />
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
  const badgeLabel = useTracksBadgeLabel();
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
        <ErrorState error={topError} message={t("errorLoading")} onRetry={refetchTop} />
      </div>
    );
  }
  if (!isTopLoading && (!topData || topData.topTracks.length === 0)) {
    return (
      <div className="space-y-12">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={null} />
        <EmptyState {...emptyStatePresets.importData} />
      </div>
    );
  }
  if (!isPagedLoading && pagedError && !pagedData) {
    return (
      <div className="space-y-12">
        <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={heroStats} />
        <ErrorState error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <TracksHeroFrame trendsHref={trendsHref} badgeLabel={badgeLabel} stats={heroStats} />

      <section className="relative animate-fade-in-up">
        <TracksSectionHeader
          eyebrow={t("sections.chart.eyebrow")}
          title={t("sections.chart.title")}
          description={t("sections.chart.description")}
        />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/35">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(139,92,246,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-accent-cyan/12 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" aria-hidden />
          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
                  {t("sections.chart.badge")}
                </div>
                <p className="font-mono text-xs text-slate-400">
                  {topData
                    ? `${topData.overview.totalListens.toLocaleString(locale)} ${t("listensCount")} · ${t("top20Listens")}`
                    : "—"}
                </p>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-3 shadow-inner backdrop-blur-sm sm:p-5">
              {isTopLoading || !topData ? (
                <TracksChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height={520}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#e2e8f0", fontSize: 12, fontWeight: 600 }}
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
                </ResponsiveContainer>
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
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/35">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_20%_80%,rgba(6,182,212,0.12),transparent_34%)]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/35 to-transparent" aria-hidden />
          <div className="relative border-b border-white/10 px-5 py-5 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">
              <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.55)]" />
              {t("sections.table.badge")}
            </div>
          </div>
          <div className="relative max-h-[min(70vh,640px)] overflow-x-auto overflow-y-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("rank")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("track")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("artist")}
                  </th>
                  <th scope="col" className="px-5 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("listens")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isPagedFetching || !pagedData ? (
                  <TracksTableRowsSkeleton count={Math.min(pageSize, 10)} />
                ) : (
                  pagedTracks.map((track, index) => (
                    <tr key={track.trackId} className="transition-colors hover:bg-white/[0.04]">
                      <td className="whitespace-nowrap px-5 py-4 text-sm tabular-nums text-slate-400">{offset + index + 1}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-white">{track.trackTitle}</td>
                      <td className="px-5 py-4 text-sm text-slate-400">{track.artistName}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-white">
                        {track.listenCount.toLocaleString(locale)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination ? (
            <div className="flex flex-col gap-3 border-t border-white/10 bg-black/35 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <p className="text-sm text-slate-400">
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
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("paginationPrevious")}
                </button>
                <label className="ml-1 inline-flex items-center gap-2 text-sm text-slate-300">
                  <span>{t("pageSizeLabel")}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => updatePaginationParams(1, Number(e.target.value))}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <span className="px-2 text-sm text-slate-400">
                  {t("paginationPage", { page, totalPages })}
                </span>
                <button
                  type="button"
                  onClick={() => updatePaginationParams(page + 1, pageSize)}
                  disabled={!pagination.hasMore}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("paginationNext")}
                </button>
              </div>
            </div>
          ) : null}
          {isPagedFetching ? <div className="px-5 pb-4 text-xs text-slate-500 sm:px-8">{t("paginationLoading")}</div> : null}
        </div>
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
