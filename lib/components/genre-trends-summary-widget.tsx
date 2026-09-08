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
import { useGenreTrends } from "@/lib/hooks/use-listening";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { GenreAccuracyChooser } from "@/lib/components/palette/genre-accuracy-chooser";
import { useTheme } from "@/lib/providers/theme-provider";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { DASHBOARD_CHART_THEME } from "@/lib/constants/dashboard-spotlight";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { DASHBOARD_BTN_GHOST, DASHBOARD_SECTION_EYEBROW, DASHBOARD_SECTION_TITLE } from "@/lib/components/dashboard-ui";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

const COLORS = [
  "#818cf8",
  "#f472b6",
  "#f59e0b",
  "#06b6d4",
  "#84cc16",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#6366f1",
  "#f43f5e",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

const GENRE_TREND_CARD_CLASS = "w-full min-w-0";
const GENRE_TREND_BACKGROUND = null;

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
  TrendsTooltipInner.displayName = "TrendsTooltip";
  return TrendsTooltipInner;
}

const DEFAULT_GENRE_COUNT = 2;
const MAX_FILTER_GENRE_COUNT = 12;

export type GenreTrendsSummaryWidgetProps = {
  startDate?: string;
  endDate?: string;
  embedded?: boolean;
};

/**
 * Compact multi-line genre trends chart for the overview dashboard.
 * Mirrors /dashboard/genres/trends (monthly aggregation, top genres by default).
 */
export function GenreTrendsSummaryWidget({
  startDate,
  endDate,
  embedded = false,
}: GenreTrendsSummaryWidgetProps) {
  const t = useTranslations("genreTrends");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const isLgChart = useIsLgChartViewport();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);

  const { data, isLoading, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    "month",
    undefined,
    viewerUserId
  );

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const filterGenres = useMemo(
    () => availableGenres.slice(0, MAX_FILTER_GENRE_COUNT),
    [availableGenres]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const trendsMinWidth = useMemo(
    () => (chartData.length > 8 ? Math.max(280, chartData.length * 28) : undefined),
    [chartData.length],
  );

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");

  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedGenres),
    [chartData, chartView, selectedGenres]
  );

  useEffect(() => {
    if (availableGenres.length === 0) return;
    if (selectedGenres.length > 0) return;
    const n = Math.min(DEFAULT_GENRE_COUNT, availableGenres.length);
    setSelectedGenres(availableGenres.slice(0, n));
  }, [availableGenres, selectedGenres.length]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
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
        <div className={`${GENRE_TREND_CARD_CLASS} animate-fade-in-up`} role="status" aria-label={t("evolution")}>
          {GENRE_TREND_BACKGROUND}
          <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="mb-3 h-7 w-36 animate-shimmer rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-64 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-4 w-80 max-w-full animate-shimmer rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="relative space-y-4 p-6">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-24 animate-shimmer rounded-full bg-white/70 dark:bg-[#1a1d2a]"
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
        <div className={`${GENRE_TREND_CARD_CLASS} p-6`}>
          {GENRE_TREND_BACKGROUND}
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!data || (chartData.length === 0 && availableGenres.length === 0)) {
    return null;
  }

  return (
    <div className={shellClass}>
      <div className={`${GENRE_TREND_CARD_CLASS} animate-fade-in-up`}>
        {GENRE_TREND_BACKGROUND}
        <div className="relative">
          <div className="border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className={DASHBOARD_SECTION_EYEBROW}>{t("title")}</p>
                <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{t("evolution")}</h2>
                <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted">{t("chartHint")}</p>
                {!isPublicDemoViewer ? (
                  <GenreAccuracyChooser viewerUserId={viewerUserId} variant="compact" className="mt-4" />
                ) : null}
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
                <Link
                  href={`/dashboard/genres/trends${trendsQuery}`}
                  className={DASHBOARD_BTN_GHOST}
                >
                  {tOverview("seeMore")}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="relative space-y-5 p-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted dark:text-slate-400">
                  {t("genresToDisplay")}
                </p>
                <span className="rounded-full border border-rose-300/25 bg-rose-300/10 px-3 py-1 text-xs font-semibold tabular-nums text-rose-700 dark:text-rose-100">
                  {selectedGenres.length}/{filterGenres.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {filterGenres.map((genre, idx) => {
                  const selected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`group inline-flex max-w-[min(100%,220px)] items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium ${
                        selected
                          ? "border-glass-hairline bg-surface-raised text-foreground"
                          : "border-transparent text-muted hover:text-foreground"
                      }`}
                      title={genre}
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
                      <span className="truncate">{genre}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedGenres.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted">
                {t("selectAtLeastOne")}
              </p>
            ) : (
              <div>
                <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-rose-300/10 blur-3xl dark:bg-rose-300/14" />
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
                      {selectedGenres.map((genre) => {
                        const color = getColor(availableGenres.indexOf(genre));
                        return (
                          <Line
                            key={genre}
                            type="monotone"
                            dataKey={genre}
                            name={genre}
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
