"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTrackStats } from "@/lib/hooks/use-tracks";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";

function TracksContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("tracks");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const { data, isLoading, error, refetch } = useTrackStats(
    startDate,
    endDate,
    userId,
    20,
    0
  );

  const topTracks = useMemo(() => data?.topTracks ?? [], [data?.topTracks]);
  const chartData = useMemo(
    () =>
      topTracks.slice(0, 12).map((track) => ({
        name: track.trackTitle.length > 24 ? `${track.trackTitle.slice(0, 24)}...` : track.trackTitle,
        fullName: `${track.trackTitle} - ${track.artistName}`,
        listens: track.listenCount,
      })),
    [topTracks]
  );

  if (isLoading) return <OverviewSkeleton />;
  if (error) return <ErrorState error={error} message={t("errorLoading")} onRetry={refetch} />;
  if (!data || data.topTracks.length === 0) return <EmptyState {...emptyStatePresets.importData} />;

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-6 py-8 shadow-2xl sm:px-8 sm:py-10">
        <div className="relative">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t("heroTitle")}</h2>
          <p className="mt-1 text-white/90">{t("heroSubtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("tracks")}</p>
              <p className="text-2xl font-bold text-white">{data.overview.totalTracks.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("listens")}</p>
              <p className="text-2xl font-bold text-white">{data.overview.totalListens.toLocaleString(locale)}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">{t("topTrack")}</p>
              <p className="text-2xl font-bold text-white">{data.overview.topTrackListenCount.toLocaleString(locale)}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 dark:border-gray-600/50 bg-white dark:bg-gray-800/90 shadow-lg">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("top12Listens")}</h3>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={420}>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("rank")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("track")}</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("artist")}</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("listens")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topTracks.map((track, index) => (
                <tr key={track.trackId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{index + 1}</td>
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
