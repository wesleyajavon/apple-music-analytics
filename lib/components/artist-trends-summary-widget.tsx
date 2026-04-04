"use client";

import { memo, useMemo, useEffect, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useArtistTrendsChart } from "@/lib/hooks/use-artists";
import { ErrorState } from "@/lib/components/error-state";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function createTrendsTooltip(t: (k: string) => string, locale: string) {
  const TrendsTooltipInner = memo(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ name: string; value: number; color: string }>;
      label?: string;
    }) => {
      if (!active || !payload?.length || !label) return null;
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="font-semibold mb-2">{label}</p>
          <ul className="space-y-1.5 text-sm">
            {payload.map((entry) => (
              <li key={entry.name} className="flex justify-between gap-4">
                <span style={{ color: entry.color }}>{entry.name}</span>
                <span className="chart-tooltip-secondary font-medium tabular-nums">
                  {Number(entry.value).toLocaleString(locale)} {t("listensDelta")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
  );
  TrendsTooltipInner.displayName = "ArtistTrendsTooltip";
  return TrendsTooltipInner;
}

const DEFAULT_ARTIST_COUNT = 5;
/** Limite d’artistes renvoyés par l’API pour garder le widget léger */
const OVERVIEW_ARTIST_TRENDS_TOP_N = 15;

export type ArtistTrendsSummaryWidgetProps = {
  startDate?: string;
  endDate?: string;
};

/**
 * Graphique compact des tendances par artiste pour l’overview (agrégation mensuelle).
 * Aligné sur /dashboard/artists/trends.
 */
export function ArtistTrendsSummaryWidget({
  startDate,
  endDate,
}: ArtistTrendsSummaryWidgetProps) {
  const t = useTranslations("artistTrends");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);

  const { data, isLoading, error, refetch } = useArtistTrendsChart(
    startDate,
    endDate,
    "month",
    undefined,
    OVERVIEW_ARTIST_TRENDS_TOP_N
  );

  const availableArtists = useMemo(
    () => data?.availableArtists ?? [],
    [data?.availableArtists]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of availableArtists) {
      m.set(a.id, a.name);
    }
    return m;
  }, [availableArtists]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (availableArtists.length === 0) return;
    if (selectedIds.length > 0) return;
    const n = Math.min(DEFAULT_ARTIST_COUNT, availableArtists.length);
    setSelectedIds(availableArtists.slice(0, n).map((a) => a.id));
  }, [availableArtists, selectedIds.length]);

  const toggleArtist = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const trendsQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    p.set("period", "month");
    const qs = p.toString();
    return qs ? `?${qs}` : "?period=month";
  }, [startDate, endDate]);

  if (isLoading) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0">
        <div className="relative h-full overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="mt-2 h-4 w-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="p-6 pt-2">
            <div className="h-[260px] bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 w-full min-w-0">
        <div className="rounded-2xl border border-card-border bg-card-surface p-6">
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!data || (chartData.length === 0 && availableArtists.length === 0)) {
    return null;
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0">
      <div className="relative h-full overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40 animate-fade-in-up">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("evolution")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("chartHint")}
                </p>
              </div>
              <Link
                href={`/dashboard/artists/trends${trendsQuery}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20 transition-colors duration-200 shrink-0 self-start"
              >
                {tOverview("seeMore")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="px-6 pb-3 pt-1">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              {t("artistsToDisplay")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableArtists.map((artist, idx) => {
                const selected = selectedIds.includes(artist.id);
                return (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => toggleArtist(artist.id)}
                    className={`inline-flex max-w-[min(100%,220px)] items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                      selected
                        ? "border-accent-violet/40 bg-accent-violet/10 text-gray-900 dark:text-white"
                        : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    title={artist.name}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: selected ? getColor(idx) : "transparent",
                        border: selected ? "none" : "1px solid #9ca3af",
                      }}
                    />
                    <span className="truncate">{artist.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 pt-2">
            {selectedIds.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {t("selectAtLeastOne")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 12, left: 0, bottom: 50 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    className="dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    angle={-40}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    width={40}
                  />
                  <Tooltip content={<TrendsTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selectedIds.map((artistId) => {
                    const idx = availableArtists.findIndex((a) => a.id === artistId);
                    const name = idToName.get(artistId) ?? artistId;
                    return (
                      <Line
                        key={artistId}
                        type="monotone"
                        dataKey={artistId}
                        name={name}
                        stroke={getColor(idx >= 0 ? idx : 0)}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                        animationDuration={500}
                        animationEasing="ease-in-out"
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
