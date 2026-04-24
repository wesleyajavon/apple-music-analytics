"use client";

import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "@/i18n/navigation";
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

  if (isTopLoading) return <OverviewSkeleton />;
  if (topError) return <ErrorState error={topError} message={t("errorLoading")} onRetry={refetchTop} />;
  if (!topData || topData.topTracks.length === 0) return <EmptyState {...emptyStatePresets.importData} />;
  if (isPagedLoading && !pagedData) return <OverviewSkeleton />;
  if (pagedError) return <ErrorState error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />;
  if (!pagedData) return <EmptyState {...emptyStatePresets.importData} />;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 shadow-2xl sm:px-8 sm:py-10">
        <div className="relative">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("heroTitle")}</h2>
          <p className="mt-1 text-white/90">{t("heroSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("tracks")}</p>
              <p className="text-2xl font-bold text-white">{topData.overview.totalTracks.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("listens")}</p>
              <p className="text-2xl font-bold text-white">{topData.overview.totalListens.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("topTrack")}</p>
              <p className="text-2xl font-bold text-white">{topData.overview.topTrackListenCount.toLocaleString(locale)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50 bg-white dark:bg-gray-800/90 shadow-lg">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("top20Listens")}</h3>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={560}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
              <defs>
                <linearGradient id="trackBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={140} />
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
              <Bar dataKey="listens" fill="url(#trackBarGradient)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50 bg-white dark:bg-gray-800/90 shadow-lg">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("allTracks")}</h3>
        </div>
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 dark:bg-gray-800/95 dark:supports-[backdrop-filter]:bg-gray-800/80">
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
                    <tr key={track.trackId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("paginationSummary", {
                start: pageStart,
                end: pageEnd,
                total: totalTracksInRange,
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updatePaginationParams(page - 1, pageSize)}
                disabled={page === 1}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
              >
                {t("paginationPrevious")}
              </button>
              <label className="ml-2 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span>{t("pageSizeLabel")}</span>
                <select
                  value={pageSize}
                  onChange={(e) => updatePaginationParams(1, Number(e.target.value))}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <span className="px-2 text-sm text-gray-600 dark:text-gray-300">
                {t("paginationPage", { page, totalPages })}
              </span>
              <button
                type="button"
                onClick={() => updatePaginationParams(page + 1, pageSize)}
                disabled={!pagination.hasMore}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
              >
                {t("paginationNext")}
              </button>
            </div>
          </div>
        ) : null}
        {isPagedFetching ? <div className="px-6 pb-4 text-xs text-gray-500 dark:text-gray-400">{t("paginationLoading")}</div> : null}
      </section>
    </div>
  );
}

export default function TracksPage() {
  const t = useTranslations("tracks");
  return (
    <div className="px-4 py-6 sm:px-0">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">{t("subtitle")}</p>
      </header>
      <Suspense fallback={<OverviewSkeleton />}>
        <TracksContent />
      </Suspense>
    </div>
  );
}
