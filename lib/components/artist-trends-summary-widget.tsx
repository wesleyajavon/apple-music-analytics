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
} from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { useArtistTrendsChart } from "@/lib/hooks/use-artists";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { useTheme } from "@/lib/providers/theme-provider";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { DASHBOARD_CHART_THEME } from "@/lib/constants/dashboard-spotlight";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

const COLORS = [
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#ec4899",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

const TREND_CARD_CLASS =
  "relative h-full overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-[#fbf8ff] to-[#eef7ff] shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-violet/30 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06]";

const TREND_BACKGROUND = (
  <>
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(6,182,212,0.14),transparent_32%),radial-gradient(circle_at_52%_100%,rgba(132,204,22,0.1),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(6,182,212,0.10),transparent_32%),radial-gradient(circle_at_52%_100%,rgba(132,204,22,0.08),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_48%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/12"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-accent-violet/16 blur-3xl dark:bg-accent-violet/14"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/50 to-transparent dark:via-cyan-200/35"
      aria-hidden
    />
  </>
);

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
  embedded?: boolean;
};

/**
 * Graphique compact des tendances par artiste pour l’overview (agrégation mensuelle).
 * Aligné sur /dashboard/artists/trends.
 */
export function ArtistTrendsSummaryWidget({
  startDate,
  endDate,
  embedded = false,
}: ArtistTrendsSummaryWidgetProps) {
  const t = useTranslations("artistTrends");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const isLgChart = useIsLgChartViewport();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);

  const { data, isLoading, error, refetch } = useArtistTrendsChart(
    startDate,
    endDate,
    "month",
    undefined,
    OVERVIEW_ARTIST_TRENDS_TOP_N,
    viewerUserId
  );

  const availableArtists = useMemo(
    () => data?.availableArtists ?? [],
    [data?.availableArtists]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const trendsMinWidth = useMemo(
    () => (chartData.length > 8 ? Math.max(280, chartData.length * 28) : undefined),
    [chartData.length],
  );

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of availableArtists) {
      m.set(a.id, a.name);
    }
    return m;
  }, [availableArtists]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");

  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedIds),
    [chartData, chartView, selectedIds]
  );

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
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `?${qs}` : "?period=month";
  }, [startDate, endDate, viewerUserId]);

  const shellClass = embedded
    ? "min-h-[320px] w-full min-w-0"
    : "sm:col-span-2 lg:col-span-4 min-h-[320px] w-full min-w-0";

  if (isLoading) {
    return (
      <div className={shellClass}>
        <div className={`${TREND_CARD_CLASS} animate-fade-in-up`} role="status" aria-label={t("evolution")}>
          {TREND_BACKGROUND}
          <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="mb-3 h-7 w-40 animate-shimmer rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-64 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-4 w-80 max-w-full animate-shimmer rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="relative space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-28 animate-shimmer rounded-full bg-white/70 dark:bg-[#1a1d2a]"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </div>
            <div className="h-[260px] animate-shimmer rounded-3xl border border-white/60 bg-white/50 shadow-inner dark:border-white/[0.06] dark:bg-[#0c0e18]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={embedded ? "w-full min-w-0" : "sm:col-span-2 lg:col-span-4 w-full min-w-0"}>
        <div className={`${TREND_CARD_CLASS} p-6`}>
          {TREND_BACKGROUND}
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
    <div className={shellClass}>
      <div className={`${TREND_CARD_CLASS} animate-fade-in-up`}>
        {TREND_BACKGROUND}
        <div className="relative">
          <div className="border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-violet/20 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet shadow-sm backdrop-blur dark:border-violet-400/18 dark:bg-[#141622] dark:text-violet-100">
                  <LiveStatusDot />
                  {tOverview("artistTrends.badge")}
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-3xl">
                  {t("evolution")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted dark:text-slate-400 sm:text-base">
                  {t("chartHint")} {tOverview("artistTrends.seeMoreHint")}
                </p>
              </div>
              <Link
                href={`/dashboard/artists/trends${trendsQuery}`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-2xl border border-card-border bg-white/70 px-4 py-2.5 text-sm font-semibold text-accent-violet shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:border-white/[0.10] dark:bg-[#161822] dark:text-violet-100 dark:hover:bg-[#1c2030]"
              >
                {tOverview("seeMore")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative space-y-5 p-6">
            <div className="rounded-3xl border border-white/70 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-white/[0.06] dark:bg-[#0c0e18]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted dark:text-slate-400">
                  {t("artistsToDisplay")}
                </p>
                <span className="rounded-full border border-accent-cyan/20 bg-accent-cyan/10 px-3 py-1 text-xs font-semibold tabular-nums text-cyan-700 dark:text-cyan-100">
                  {selectedIds.length}/{availableArtists.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableArtists.map((artist, idx) => {
                  const selected = selectedIds.includes(artist.id);
                  return (
                    <button
                      key={artist.id}
                      type="button"
                      onClick={() => toggleArtist(artist.id)}
                      className={`group inline-flex max-w-[min(100%,240px)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 ${
                        selected
                          ? "border-accent-violet/25 bg-white/85 text-gray-950 shadow-card dark:border-white/12 dark:bg-slate-800/95 dark:text-white"
                          : "border-white/70 bg-white/45 text-muted hover:bg-white/75 dark:border-white/[0.07] dark:bg-[#12141f] dark:text-slate-300 dark:hover:bg-[#181b28]"
                      }`}
                      title={artist.name}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-110"
                        style={{
                          backgroundColor: selected ? getColor(idx) : "transparent",
                          boxShadow: selected ? `0 0 16px ${getColor(idx)}66` : "none",
                          border: selected
                            ? "none"
                            : resolvedTheme === "dark"
                              ? "1px solid rgba(148, 163, 184, 0.32)"
                              : "1px solid rgba(148, 163, 184, 0.55)",
                        }}
                      />
                      <span className="truncate">{artist.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedIds.length === 0 ? (
              <p className="rounded-3xl border border-white/70 bg-white/55 py-10 text-center text-sm text-muted shadow-inner dark:border-white/[0.06] dark:bg-[#0c0e18] dark:text-slate-400">
                {t("selectAtLeastOne")}
              </p>
            ) : (
              <div className="relative rounded-3xl border border-white/70 bg-white/60 p-3 shadow-inner backdrop-blur dark:border-white/[0.06] dark:bg-[#080913]">
                <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
                  <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
                </div>
                <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-accent-cyan/10 blur-3xl dark:bg-accent-cyan/15" />
                <ChartResponsiveContainer token="trendsLine" minWidth={trendsMinWidth}>
                    <LineChart
                      data={displayChartData}
                      margin={{ top: 12, right: 16, left: 0, bottom: isLgChart ? 50 : 44 }}
                    >
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke={chartTheme.grid}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fill: chartTheme.tick, fontSize: 11, fontWeight: 600 }}
                        stroke={chartTheme.axisStroke}
                        tickLine={false}
                        axisLine={false}
                        angle={isLgChart ? -40 : -35}
                        textAnchor="end"
                        height={isLgChart ? 70 : 58}
                      />
                      <YAxis
                        tick={{ fill: chartTheme.tick, fontSize: 11, fontWeight: 600 }}
                        stroke={chartTheme.axisStroke}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                      />
                      <Tooltip content={<TrendsTooltip />} />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: 12,
                          fontWeight: 600,
                          paddingTop: 8,
                          color: chartTheme.legend,
                        }}
                      />
                      {selectedIds.map((artistId) => {
                        const idx = availableArtists.findIndex((a) => a.id === artistId);
                        const name = idToName.get(artistId) ?? artistId;
                        const color = getColor(idx >= 0 ? idx : 0);
                        return (
                          <Line
                            key={artistId}
                            type="monotone"
                            dataKey={artistId}
                            name={name}
                            stroke={color}
                            strokeWidth={2.75}
                            dot={false}
                            activeDot={{
                              r: 5,
                              stroke: chartTheme.pieStroke,
                              strokeWidth: 2,
                              fill: color,
                            }}
                            animationDuration={650}
                            animationEasing="ease-in-out"
                          />
                        );
                      })}
                    </LineChart>
                </ChartResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
