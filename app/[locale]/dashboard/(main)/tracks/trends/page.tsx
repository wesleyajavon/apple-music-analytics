"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { getPeriodFromSearchParams, PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { nextDefaultTrendSelection } from "@/lib/utils/listen-trend-default-selection";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";
import { useTrackTrendsChart } from "@/lib/hooks/use-tracks";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_CHART_CONTROLS_ROW,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";
import { DuetCompareDeepLink } from "@/lib/components/duet/duet-compare-deep-link";
import { TracksSectionSwitcher } from "@/lib/components/tracks-section-switcher";
import {
  TrackTrendsMobileEmpty,
  TrackTrendsMobileError,
  TrackTrendsMobileExperience,
  TrackTrendsMobileSkeleton,
} from "@/lib/components/track-trends-mobile";

const MAX_SERIES_TRACKS = 50;
const TRACK_SELECTION_DEBOUNCE_MS = 450;

function useTracksListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/tracks?${qs}` : "/dashboard/tracks";
  }, [searchParams]);
}

function idsEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function TrackTrendsSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
      <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{title}</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
    </div>
  );
}

function TrackTrendsMetricStrip({
  period,
  selectedCount,
  loading = false,
}: {
  period: PeriodType;
  selectedCount: number;
  loading?: boolean;
}) {
  const t = useTranslations("trackTrends");
  const tPeriod = useTranslations("components.periodSelector");
  const labelKey = periodToLabelKey(period);

  return (
    <div
      className={`${DASHBOARD_METRIC_STRIP} w-full max-lg:flex-nowrap max-lg:overflow-x-auto`}
      aria-busy={loading || undefined}
    >
      <div className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[10.5rem] max-lg:flex-none`}>
        <span className={DASHBOARD_METRIC_LABEL}>{t("heroPanelGroupBy")}</span>
        {loading ? (
          <span
            className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
          />
        ) : (
          <span className={DASHBOARD_METRIC_VALUE}>{tPeriod(labelKey)}</span>
        )}
      </div>
      <div className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[10.5rem] max-lg:flex-none`}>
        <span className={DASHBOARD_METRIC_LABEL}>{t("heroPanelSeries")}</span>
        {loading ? (
          <span
            className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
          />
        ) : (
          <span className={DASHBOARD_METRIC_VALUE}>
            {selectedCount} / {MAX_SERIES_TRACKS}
          </span>
        )}
      </div>
    </div>
  );
}

function TrackTrendsMasthead({
  subtitleKey,
}: {
  subtitleKey: "subtitle" | "subtitleExtended";
}) {
  const t = useTranslations("trackTrends");
  return <OverviewHeroFrame title={t("title")} description={t(subtitleKey)} />;
}

function TrackPickerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-10 w-full max-w-md rounded-xl border border-border bg-surface animate-shimmer" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-full border border-border bg-surface animate-shimmer"
            style={{ width: `${96 + ((index * 19) % 90)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function TrackTrendsChartSkeleton() {
  return (
    <div className="relative min-h-[280px] lg:min-h-[500px]" aria-busy="true">
      <div className="flex h-[232px] flex-col justify-between lg:h-[452px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-glass-hairline" />
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-12 top-8">
        <svg className="h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 230 C120 170 180 250 290 185 S500 120 610 165 720 220 800 135"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/40"
          />
          <path
            d="M0 285 C150 220 220 235 330 205 S520 250 640 160 730 115 800 150"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/30"
          />
        </svg>
      </div>
    </div>
  );
}

function TrendsContent() {
  const tracksHref = useTracksListHref();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const chartThemeKey = resolvedTheme === "dark" ? "dark" : "light";
  const getColor = useCallback(
    (index: number) => getCrystalSeriesColor(index, chartThemeKey),
    [chartThemeKey]
  );
  const t = useTranslations("trackTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets({
    demoPath: "/dashboard/tracks/trends",
  });
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");
  const userId = searchParams.get("userId") ?? undefined;

  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;

  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listensDelta")}`,
    [locale, t]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extraSearchTracks, setExtraSearchTracks] = useState<TrackTrendsChartTrack[]>([]);
  const selectionTouchedRef = useRef(false);
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setExtraSearchTracks([]);
  }, [startDate, endDate]);

  const debouncedSelectedIds = useDebouncedValue(selectedIds, selectionDebounceMs);
  const selectionPending = !idsEqualSorted(selectedIds, debouncedSelectedIds);
  const trackIdsForFetch = debouncedSelectedIds.length > 0 ? debouncedSelectedIds : undefined;

  const { data, isLoading, isFetching, error, refetch } = useTrackTrendsChart(
    startDate,
    endDate,
    period,
    trackIdsForFetch,
    20,
    userId
  );

  useEffect(() => {
    setSelectionDebounceMs(0);
  }, [startDate, endDate, period]);

  useEffect(() => {
    if (!isFetching && data && !error) {
      setSelectionDebounceMs(TRACK_SELECTION_DEBOUNCE_MS);
    }
  }, [isFetching, data, error]);

  const pickerTracks = useMemo(() => {
    const base = data?.catalogTracks ?? data?.availableTracks ?? [];
    const merged = new Map<string, TrackTrendsChartTrack>();
    for (const item of base) merged.set(item.id, item);
    for (const item of extraSearchTracks) merged.set(item.id, item);
    return Array.from(merged.values());
  }, [data?.catalogTracks, data?.availableTracks, extraSearchTracks]);

  useEffect(() => {
    const catalog = data?.catalogTracks;
    if (!catalog?.length) return;
    setExtraSearchTracks((prev) => {
      const ids = new Set(catalog.map((item) => item.id));
      return prev.filter((item) => !ids.has(item.id));
    });
  }, [data?.catalogTracks]);

  const defaultSourceIds = useMemo(() => {
    const src = data?.catalogTracks ?? data?.availableTracks;
    return src?.map((item) => item.id) ?? [];
  }, [data?.catalogTracks, data?.availableTracks]);

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setSelectedIds((prev) => {
      const next = nextDefaultTrendSelection({
        selectionTouched: false,
        chartFetching: isFetching,
        catalogIds: defaultSourceIds,
        currentIds: prev,
      });
      return next ?? prev;
    });
  }, [startDate, endDate, isFetching, defaultSourceIds]);

  const toggleTrack = useCallback((id: string) => {
    selectionTouchedRef.current = true;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_TRACKS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteTrack = useCallback((track: TrackTrendsChartTrack) => {
    selectionTouchedRef.current = true;
    setExtraSearchTracks((prev) => (prev.some((p) => p.id === track.id) ? prev : [...prev, track]));
    setSelectedIds((prev) => {
      if (prev.includes(track.id)) return prev;
      if (prev.length >= MAX_SERIES_TRACKS) return prev;
      return [...prev, track.id];
    });
  }, []);

  const selectAll = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedIds(pickerTracks.slice(0, MAX_SERIES_TRACKS).map((item) => item.id));
  }, [pickerTracks]);

  const selectNone = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedIds([]);
  }, []);
  const getTrackIndex = useCallback((trackId: string) => pickerTracks.findIndex((x) => x.id === trackId), [pickerTracks]);
  const idToTrack = useMemo(() => new Map(pickerTracks.map((item) => [item.id, item])), [pickerTracks]);
  const chartData = data?.data ?? [];
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedIds),
    [chartData, chartView, selectedIds]
  );

  const chartSeries = useMemo(
    () =>
      selectedIds.map((trackId) => {
        const idx = getTrackIndex(trackId);
        const track = idToTrack.get(trackId);
        return {
          dataKey: trackId,
          name: track ? getTrackLabel(track) : trackId,
          color: getColor(idx >= 0 ? idx : 0),
        };
      }),
    [getColor, getTrackIndex, idToTrack, selectedIds]
  );

  const chartSyncing = isFetching || selectionPending;

  const masthead = (
    <>
      <TrackTrendsMasthead subtitleKey="subtitleExtended" />
      <TrackTrendsMetricStrip
        period={period}
        selectedCount={selectedIds.length}
        loading={isLoading && !data}
      />
    </>
  );

  if (!isLoading && error && !data) {
    return (
      <>
        <div className={DASHBOARD_CHART_CONTROLS_ROW}>
          <PeriodSelector defaultPeriod="month" value={period} />
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
        <div className="lg:hidden">
          <TrackTrendsMobileError error={error} onRetry={() => refetch()} />
        </div>
        <div className="mt-6 hidden space-y-8 lg:block">
          {masthead}
          <TracksSectionSwitcher idPrefix="track-trends-desktop" activeSection="trends" />
        </div>
      </>
    );
  }

  if (!isLoading && (!data || (chartData.length === 0 && pickerTracks.length === 0))) {
    return (
      <>
        <div className={DASHBOARD_CHART_CONTROLS_ROW}>
          <PeriodSelector defaultPeriod="month" value={period} />
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
        <div className="lg:hidden">
          <TrackTrendsMobileEmpty tracksHref={tracksHref} />
        </div>
        <div className="mt-6 hidden space-y-8 lg:block">
          {masthead}
          <TracksSectionSwitcher idPrefix="track-trends-desktop" activeSection="trends" />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className={DASHBOARD_CHART_CONTROLS_ROW}>
        <PeriodSelector defaultPeriod="month" value={period} />
        <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
      </div>

      <div className="lg:hidden">
        <TrackTrendsMobileExperience
          tracksHref={tracksHref}
          period={period}
          selectedIds={selectedIds}
          pickerTracks={pickerTracks}
          chartData={chartData}
          chartDisplayData={displayChartData}
          isLoading={isLoading}
          isUpdating={isFetching || selectionPending}
          idToTrack={idToTrack}
          getTrackIndex={getTrackIndex}
          getColor={getColor}
          toggleTrack={toggleTrack}
          selectAll={selectAll}
          selectNone={selectNone}
          handlePickRemoteTrack={handlePickRemoteTrack}
          maxSelectable={MAX_SERIES_TRACKS}
          chartView={chartView}
          setChartView={setChartView}
        />
      </div>

      <div className="mt-6 hidden space-y-8 lg:block">
        {masthead}

        <TracksSectionSwitcher idPrefix="track-trends-desktop" activeSection="trends" />

        <section className="relative animate-fade-in-up">
          <TrackTrendsSectionHeader
            eyebrow={t("sections.picker.eyebrow")}
            title={t("sections.picker.title")}
            description={t("sections.picker.description")}
          />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-muted">{t("sections.picker.badge")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={selectAll} className={DASHBOARD_BTN_GHOST}>
                {t("all")}
              </button>
              <button type="button" onClick={selectNone} className={DASHBOARD_BTN_GHOST}>
                {t("none")}
              </button>
            </div>
          </div>
          {isLoading ? (
            <TrackPickerSkeleton />
          ) : (
            <TrackTrendsTrackPicker
              catalogTracks={pickerTracks}
              selectedIds={selectedIds}
              onToggle={toggleTrack}
              getColor={getColor}
              getTrackIndex={getTrackIndex}
              enableRemoteSearch
              onPickRemoteTrack={handlePickRemoteTrack}
              maxSelectable={MAX_SERIES_TRACKS}
            />
          )}
        </section>

        <section
          className="relative animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
          aria-labelledby="track-trends-chart-title"
        >
          <TrackTrendsSectionHeader
            eyebrow={t("sections.chart.eyebrow")}
            title={t("sections.chart.title")}
            description={t("sections.chart.description")}
          />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p id="track-trends-chart-title" className="text-[13px] text-muted">
              {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_TRACKS })}
            </p>
            {selectedIds.length === 1 ? (
              <DuetCompareDeepLink entityType="track" entityId={selectedIds[0]!} />
            ) : null}
          </div>
          {isLoading ? (
            <TrackTrendsChartSkeleton />
          ) : selectedIds.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted">{t("selectAtLeastOne")}</p>
          ) : (
            <div className="relative min-h-[280px] lg:min-h-[500px]" aria-busy={chartSyncing}>
              {chartSyncing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-4 text-center">
                  <span
                    className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-foreground">
                    {selectionPending ? t("selectionPending") : t("chartUpdating")}
                  </span>
                </div>
              )}
              <div
                className={`transition-opacity duration-200 ${chartSyncing ? "pointer-events-none opacity-40" : ""}`}
              >
                <OverviewTrendsChart
                  data={displayChartData}
                  series={chartSeries}
                  formatValue={formatValue}
                  minWidth={
                    chartData.length > 10 ? Math.max(320, chartData.length * 32) : undefined
                  }
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function TrackTrendsFallback() {
  const searchParams = useSearchParams();
  const period = getPeriodFromSearchParams(searchParams, "month");

  return (
    <>
      <div className={DASHBOARD_CHART_CONTROLS_ROW}>
        <div className="h-11 w-64 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
      </div>
      <div className="mt-5 lg:hidden">
        <TrackTrendsMobileSkeleton />
      </div>
      <div className="mt-6 hidden space-y-8 lg:block">
        <TrackTrendsMasthead subtitleKey="subtitle" />
        <TrackTrendsMetricStrip period={period} selectedCount={0} loading />
        <TracksSectionSwitcher idPrefix="track-trends-desktop-fallback" activeSection="trends" />
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function TrackTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<TrackTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
