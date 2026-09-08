"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { useArtistTrendsChart } from "@/lib/hooks/use-artists";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { ErrorState } from "@/lib/components/error-state";
import { useTheme } from "@/lib/providers/theme-provider";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { ArtistTrendsArtistPicker } from "@/lib/components/artist-trends-artist-picker";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const DEFAULT_ARTIST_COUNT = 5;
/** Limite d’artistes renvoyés par l’API pour garder le widget léger */
const OVERVIEW_ARTIST_TRENDS_TOP_N = 15;
const MAX_SERIES_ARTISTS = 50;
/** Délai après lequel les sélections d’artistes hors catalogue déclenchent le chart. */
const ARTIST_SELECTION_DEBOUNCE_MS = 450;

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
  const [extraSearchArtists, setExtraSearchArtists] = useState<ArtistTrendsChartArtist[]>([]);
  const [useExplicitSeries, setUseExplicitSeries] = useState(false);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);
  const defaultSelectionAppliedRef = useRef(false);

  useEffect(() => {
    defaultSelectionAppliedRef.current = false;
    setExtraSearchArtists([]);
    setSelectedIds([]);
    setUseExplicitSeries(false);
    setSelectionDebounceMs(0);
  }, [startDate, endDate, viewerUserId]);

  const debouncedSelectedIds = useDebouncedValue(
    selectedIds,
    useExplicitSeries ? selectionDebounceMs : 0
  );

  const artistIdsForFetch =
    useExplicitSeries && debouncedSelectedIds.length > 0
      ? debouncedSelectedIds
      : undefined;

  const { data, isLoading, isFetching, error, refetch } = useArtistTrendsChart(
    startDate,
    endDate,
    "month",
    artistIdsForFetch,
    OVERVIEW_ARTIST_TRENDS_TOP_N,
    viewerUserId
  );

  useEffect(() => {
    if (!useExplicitSeries) return;
    if (!isFetching && data != null && !error) {
      setSelectionDebounceMs(ARTIST_SELECTION_DEBOUNCE_MS);
    }
  }, [useExplicitSeries, isFetching, data, error]);

  const pickerArtists = useMemo(() => {
    const base = data?.catalogArtists ?? data?.availableArtists ?? [];
    const merged = new Map<string, ArtistTrendsChartArtist>();
    for (const artist of base) merged.set(artist.id, artist);
    for (const artist of extraSearchArtists) merged.set(artist.id, artist);
    return Array.from(merged.values());
  }, [data?.catalogArtists, data?.availableArtists, extraSearchArtists]);

  useEffect(() => {
    const catalog = data?.catalogArtists;
    if (!catalog?.length) return;
    setExtraSearchArtists((prev) => {
      const ids = new Set(catalog.map((artist) => artist.id));
      return prev.filter((artist) => !ids.has(artist.id));
    });
  }, [data?.catalogArtists]);

  const availableArtists = useMemo(
    () => data?.availableArtists ?? [],
    [data?.availableArtists]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const trendsMinWidth = useMemo(
    () => (chartData.length > 8 ? Math.max(280, chartData.length * 28) : undefined),
    [chartData.length],
  );
  const chartSyncing = useExplicitSeries && isFetching;

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const artist of pickerArtists) m.set(artist.id, artist.name);
    for (const artist of availableArtists) {
      if (!m.has(artist.id)) m.set(artist.id, artist.name);
    }
    return m;
  }, [pickerArtists, availableArtists]);

  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedIds),
    [chartData, chartView, selectedIds]
  );

  const defaultSourceIds = useMemo(
    () => (data?.catalogArtists ?? data?.availableArtists)?.map((artist) => artist.id) ?? [],
    [data?.catalogArtists, data?.availableArtists]
  );

  useEffect(() => {
    if (defaultSourceIds.length === 0) return;
    if (defaultSelectionAppliedRef.current) return;
    if (selectedIds.length > 0) return;
    const n = Math.min(DEFAULT_ARTIST_COUNT, defaultSourceIds.length);
    setSelectedIds(defaultSourceIds.slice(0, n));
    defaultSelectionAppliedRef.current = true;
  }, [defaultSourceIds, selectedIds.length]);

  const toggleArtist = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteArtist = useCallback((artist: ArtistTrendsChartArtist) => {
    setUseExplicitSeries(true);
    setExtraSearchArtists((prev) => {
      if (prev.some((item) => item.id === artist.id)) return prev;
      return [...prev, artist];
    });
    setSelectedIds((prev) => {
      if (prev.includes(artist.id)) return prev;
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, artist.id];
    });
  }, []);

  const getArtistIndex = useCallback(
    (artistId: string) => pickerArtists.findIndex((artist) => artist.id === artistId),
    [pickerArtists]
  );

  const chartSeries = useMemo(
    () =>
      selectedIds.map((artistId) => {
        const idx = getArtistIndex(artistId);
        return {
          dataKey: artistId,
          name: idToName.get(artistId) ?? artistId,
          color: getColor(idx),
        };
      }),
    [getArtistIndex, getColor, idToName, selectedIds]
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

  if (!data || (chartData.length === 0 && pickerArtists.length === 0)) {
    return null;
  }

  return (
    <div className={shellClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className={DASHBOARD_SECTION_EYEBROW}>{tOverview("artistTrends.badge")}</p>
          <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{t("evolution")}</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-muted">
            {t("chartHint")} {tOverview("artistTrends.seeMoreHint")}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          <Link href={`/dashboard/artists/trends${trendsQuery}`} className={`${DASHBOARD_BTN_GHOST} shrink-0`}>
            {tOverview("seeMore")}
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-3 text-[13px] text-muted">{t("artistsToDisplay")}</p>
          <ArtistTrendsArtistPicker
            catalogArtists={pickerArtists}
            selectedIds={selectedIds}
            onToggle={toggleArtist}
            getColor={getColor}
            getArtistIndex={getArtistIndex}
            enableRemoteSearch
            onPickRemoteArtist={handlePickRemoteArtist}
            maxSelectable={MAX_SERIES_ARTISTS}
            idPrefix="overview-artist-trends"
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
