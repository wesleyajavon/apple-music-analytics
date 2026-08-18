"use client";

import { memo, useMemo, useEffect, useState, useCallback, useRef } from "react";
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
import { useTrackTrendsChart } from "@/lib/hooks/use-tracks";
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
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const COLORS = [
  "#06b6d4",
  "#84cc16",
  "#8b5cf6",
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

const TRACK_TREND_CARD_CLASS =
  "relative h-full overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-[#f8fdff] to-[#f4fff8] shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06]";

const TRACK_TREND_BACKGROUND = (
  <>
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.14),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(132,204,22,0.12),transparent_32%),radial-gradient(circle_at_52%_100%,rgba(139,92,246,0.1),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.14),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(132,204,22,0.10),transparent_32%),radial-gradient(circle_at_52%_100%,rgba(139,92,246,0.08),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_48%)]"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/12"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-accent-emerald/16 blur-3xl dark:bg-accent-emerald/12"
      aria-hidden
    />
    <div
      className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/55 to-transparent dark:via-cyan-200/38"
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
  TrendsTooltipInner.displayName = "TrackTrendsTooltip";
  return TrendsTooltipInner;
}

const DEFAULT_TRACK_COUNT = 5;
const OVERVIEW_TRACK_TRENDS_TOP_N = 20;
const MAX_SERIES_TRACKS = 50;
/** Délai après lequel les sélections de titres hors catalogue déclenchent le chart. */
const TRACK_SELECTION_DEBOUNCE_MS = 450;

export type TrackTrendsSummaryWidgetProps = {
  startDate?: string;
  endDate?: string;
  embedded?: boolean;
};

export function TrackTrendsSummaryWidget({
  startDate,
  endDate,
  embedded = false,
}: TrackTrendsSummaryWidgetProps) {
  const t = useTranslations("trackTrends");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();
  const { resolvedTheme } = useTheme();
  const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const isLgChart = useIsLgChartViewport();
  const TrendsTooltip = useMemo(() => createTrendsTooltip(t, locale), [t, locale]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extraSearchTracks, setExtraSearchTracks] = useState<TrackTrendsChartTrack[]>([]);
  const [useExplicitSeries, setUseExplicitSeries] = useState(false);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);
  const defaultSelectionAppliedRef = useRef(false);

  useEffect(() => {
    defaultSelectionAppliedRef.current = false;
    setExtraSearchTracks([]);
    setSelectedIds([]);
    setUseExplicitSeries(false);
    setSelectionDebounceMs(0);
  }, [startDate, endDate, viewerUserId]);

  const debouncedSelectedIds = useDebouncedValue(
    selectedIds,
    useExplicitSeries ? selectionDebounceMs : 0
  );

  const trackIdsForFetch =
    useExplicitSeries && debouncedSelectedIds.length > 0
      ? debouncedSelectedIds
      : undefined;

  const { data, isLoading, isFetching, error, refetch } = useTrackTrendsChart(
    startDate,
    endDate,
    "month",
    trackIdsForFetch,
    OVERVIEW_TRACK_TRENDS_TOP_N,
    viewerUserId
  );

  useEffect(() => {
    if (!useExplicitSeries) return;
    if (!isFetching && data != null && !error) {
      setSelectionDebounceMs(TRACK_SELECTION_DEBOUNCE_MS);
    }
  }, [useExplicitSeries, isFetching, data, error]);

  const pickerTracks = useMemo(() => {
    const base = data?.catalogTracks ?? data?.availableTracks ?? [];
    const merged = new Map<string, TrackTrendsChartTrack>();
    for (const track of base) merged.set(track.id, track);
    for (const track of extraSearchTracks) merged.set(track.id, track);
    return Array.from(merged.values());
  }, [data?.catalogTracks, data?.availableTracks, extraSearchTracks]);

  useEffect(() => {
    const catalog = data?.catalogTracks;
    if (!catalog?.length) return;
    setExtraSearchTracks((prev) => {
      const ids = new Set(catalog.map((track) => track.id));
      return prev.filter((track) => !ids.has(track.id));
    });
  }, [data?.catalogTracks]);

  const availableTracks = useMemo(
    () => data?.availableTracks ?? [],
    [data?.availableTracks]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const trendsMinWidth = useMemo(
    () => (chartData.length > 8 ? Math.max(280, chartData.length * 28) : undefined),
    [chartData.length],
  );
  const chartSyncing = useExplicitSeries && isFetching;

  const idToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const track of pickerTracks) {
      map.set(track.id, getTrackLabel(track));
    }
    for (const track of availableTracks) {
      if (!map.has(track.id)) map.set(track.id, getTrackLabel(track));
    }
    return map;
  }, [pickerTracks, availableTracks]);

  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedIds),
    [chartData, chartView, selectedIds]
  );

  const defaultSourceIds = useMemo(
    () => (data?.catalogTracks ?? data?.availableTracks)?.map((track) => track.id) ?? [],
    [data?.catalogTracks, data?.availableTracks]
  );

  useEffect(() => {
    if (defaultSourceIds.length === 0) return;
    if (defaultSelectionAppliedRef.current) return;
    if (selectedIds.length > 0) return;
    const n = Math.min(DEFAULT_TRACK_COUNT, defaultSourceIds.length);
    setSelectedIds(defaultSourceIds.slice(0, n));
    defaultSelectionAppliedRef.current = true;
  }, [defaultSourceIds, selectedIds.length]);

  const toggleTrack = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_TRACKS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteTrack = useCallback((track: TrackTrendsChartTrack) => {
    setUseExplicitSeries(true);
    setExtraSearchTracks((prev) => {
      if (prev.some((item) => item.id === track.id)) return prev;
      return [...prev, track];
    });
    setSelectedIds((prev) => {
      if (prev.includes(track.id)) return prev;
      if (prev.length >= MAX_SERIES_TRACKS) return prev;
      return [...prev, track.id];
    });
  }, []);

  const getTrackIndex = useCallback(
    (trackId: string) => pickerTracks.findIndex((track) => track.id === trackId),
    [pickerTracks]
  );

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
        <div className={`${TRACK_TREND_CARD_CLASS} animate-fade-in-up`} role="status" aria-label={t("evolution")}>
          {TRACK_TREND_BACKGROUND}
          <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="mb-3 h-7 w-36 animate-shimmer rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-64 max-w-full animate-shimmer rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-4 w-80 max-w-full animate-shimmer rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          <div className="relative space-y-4 p-6">
            <div className="h-11 w-full max-w-md animate-shimmer rounded-xl bg-white/70 dark:bg-[#1a1d2a]" />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-32 animate-shimmer rounded-full bg-white/70 dark:bg-[#1a1d2a]"
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
        <div className={`${TRACK_TREND_CARD_CLASS} p-6`}>
          {TRACK_TREND_BACKGROUND}
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!data || (chartData.length === 0 && pickerTracks.length === 0)) {
    return null;
  }

  return (
    <div className={shellClass}>
      <div className={`${TRACK_TREND_CARD_CLASS} animate-fade-in-up`}>
        {TRACK_TREND_BACKGROUND}
        <div className="relative">
          <div className="border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 shadow-sm backdrop-blur dark:border-cyan-400/18 dark:bg-[#141622] dark:text-cyan-100">
                  <LiveStatusDot />
                  {t("title")}
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white sm:text-3xl">
                  {t("evolution")}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted dark:text-slate-400 sm:text-base">
                  {t("chartHint")}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
                <Link
                  href={`/dashboard/tracks/trends${trendsQuery}`}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-card-border bg-white/70 px-4 py-2.5 text-sm font-semibold text-cyan-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:border-white/[0.10] dark:bg-[#161822] dark:text-cyan-100 dark:hover:bg-[#1c2030]"
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
            <div className="rounded-3xl border border-white/70 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-white/[0.06] dark:bg-[#0c0e18]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted dark:text-slate-400">
                {t("tracksToDisplay")}
              </p>
              <TrackTrendsTrackPicker
                catalogTracks={pickerTracks}
                selectedIds={selectedIds}
                onToggle={toggleTrack}
                getColor={getColor}
                getTrackIndex={getTrackIndex}
                enableRemoteSearch
                onPickRemoteTrack={handlePickRemoteTrack}
                maxSelectable={MAX_SERIES_TRACKS}
                idPrefix="overview-track-trends"
                compact
              />
            </div>

            {selectedIds.length === 0 ? (
              <p className="rounded-3xl border border-white/70 bg-white/55 py-10 text-center text-sm text-muted shadow-inner dark:border-white/[0.06] dark:bg-[#0c0e18] dark:text-slate-400">
                {t("selectAtLeastOne")}
              </p>
            ) : (
              <div
                className={`relative rounded-3xl border border-white/70 bg-white/60 p-3 shadow-inner backdrop-blur transition-opacity dark:border-white/[0.06] dark:bg-[#080913] ${
                  chartSyncing ? "opacity-70" : ""
                }`}
                aria-busy={chartSyncing}
              >
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
                      {selectedIds.map((trackId) => {
                        const idx = getTrackIndex(trackId);
                        const label = idToLabel.get(trackId) ?? trackId;
                        const color = getColor(idx >= 0 ? idx : 0);
                        return (
                          <Line
                            key={trackId}
                            type="monotone"
                            dataKey={trackId}
                            name={label}
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
