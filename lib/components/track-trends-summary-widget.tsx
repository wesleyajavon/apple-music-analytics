"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { useTrackTrendsChart } from "@/lib/hooks/use-tracks";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { useTheme } from "@/lib/providers/theme-provider";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

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
  const chartThemeName = resolvedTheme === "dark" ? "dark" : "light";
  const getColor = useCallback(
    (index: number) => getCrystalSeriesColor(index, chartThemeName),
    [chartThemeName]
  );
  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listensDelta")}`,
    [locale, t]
  );

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
    [chartData.length]
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

  const chartSeries = useMemo(
    () =>
      selectedIds.map((trackId) => {
        const idx = getTrackIndex(trackId);
        return {
          dataKey: trackId,
          name: idToLabel.get(trackId) ?? trackId,
          color: getColor(idx),
        };
      }),
    [getColor, getTrackIndex, idToLabel, selectedIds]
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
      <div className={shellClass} role="status" aria-label={t("evolution")}>
        <div className="h-4 w-24 animate-shimmer rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-8 w-64 max-w-full animate-shimmer rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-6 h-[260px] animate-shimmer rounded-[22px] bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={embedded ? "w-full min-w-0" : "sm:col-span-2 lg:col-span-4 w-full min-w-0"}>
        <ErrorState error={error} message={t("errorLoading")} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || (chartData.length === 0 && pickerTracks.length === 0)) {
    return null;
  }

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("title")}</p>
          <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{t("evolution")}</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted">{t("chartHint")}</p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          <Link href={`/dashboard/tracks/trends${trendsQuery}`} className={`${DASHBOARD_BTN_GHOST} shrink-0`}>
            {tOverview("seeMore")}
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-3 text-[13px] text-muted">{t("tracksToDisplay")}</p>
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
          <p className="py-10 text-center text-[13px] text-muted">{t("selectAtLeastOne")}</p>
        ) : (
          <div className={chartSyncing ? "opacity-70" : ""} aria-busy={chartSyncing}>
            <OverviewTrendsChart
              data={displayChartData}
              series={chartSeries}
              formatValue={formatValue}
              minWidth={trendsMinWidth}
            />
          </div>
        )}
      </div>
    </div>
  );
}
