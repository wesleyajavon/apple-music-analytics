"use client";

import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  useArtistTrendsChart,
  useArtistTrendsCommentary,
} from "@/lib/hooks/use-artists";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { getPeriodFromSearchParams, PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { nextDefaultTrendSelection } from "@/lib/utils/listen-trend-default-selection";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { ArtistTrendsArtistPicker } from "@/lib/components/artist-trends-artist-picker";
import {
  ArtistTrendsMobileEmpty,
  ArtistTrendsMobileError,
  ArtistTrendsMobileExperience,
  ArtistTrendsMobileSkeleton,
} from "@/lib/components/artist-trends-mobile";
import { ArtistsViewSwitcher } from "@/lib/components/artists-view-switcher";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
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
import { ArrowLeft } from "lucide-react";

const MAX_SERIES_ARTISTS = 50;
/** Délai après lequel les sélections d’artistes déclenchent chart + IA (évite rafales de requêtes). */
const ARTIST_SELECTION_DEBOUNCE_MS = 450;

function useArtistsListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/artists?${qs}` : "/dashboard/artists";
  }, [searchParams]);
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function ArtistTrendsSectionHeader({
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

function ArtistTrendsMetricStrip({
  period,
  selectedCount,
  loading = false,
}: {
  period: PeriodType;
  selectedCount: number;
  loading?: boolean;
}) {
  const t = useTranslations("artistTrends");
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
            {selectedCount} / {MAX_SERIES_ARTISTS}
          </span>
        )}
      </div>
    </div>
  );
}

function ArtistTrendsMasthead({
  artistsHref,
  subtitleKey,
}: {
  artistsHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
}) {
  const t = useTranslations("artistTrends");
  return (
    <div className="space-y-4">
      <OverviewHeroFrame title={t("title")} description={t(subtitleKey)} />
      <Link href={artistsHref} className={`${DASHBOARD_BTN_GHOST} gap-2`}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToArtists")}
      </Link>
    </div>
  );
}

function ArtistPickerSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-10 w-full max-w-md rounded-xl border border-border bg-surface animate-shimmer" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="h-9 rounded-full border border-border bg-surface animate-shimmer"
            style={{ width: `${96 + ((index * 23) % 88)}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function ArtistTrendsChartSkeleton() {
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
            d="M0 250 C90 210 160 190 250 205 S430 120 540 150 700 210 800 105"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted/40"
          />
          <path
            d="M0 285 C120 230 230 250 320 180 S510 210 620 145 735 125 800 170"
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

function idsEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function TrendsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const chartThemeKey = resolvedTheme === "dark" ? "dark" : "light";
  const getColor = useCallback(
    (index: number) => getCrystalSeriesColor(index, chartThemeKey),
    [chartThemeKey]
  );
  const t = useTranslations("artistTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");

  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const artistsHref = useArtistsListHref();

  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listensDelta")}`,
    [locale, t]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">(
    "light"
  );
  const [extraSearchArtists, setExtraSearchArtists] = useState<
    ArtistTrendsChartArtist[]
  >([]);
  const selectionTouchedRef = useRef(false);

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setExtraSearchArtists([]);
  }, [startDate, endDate]);

  /** 0 ms jusqu’à la première réponse chart — pas de délai au premier rendu des sélections par défaut. */
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);
  const debouncedSelectedIds = useDebouncedValue(
    selectedIds,
    selectionDebounceMs
  );
  const selectionPending = !idsEqualSorted(selectedIds, debouncedSelectedIds);

  const artistIdsForFetch =
    debouncedSelectedIds.length > 0 ? debouncedSelectedIds : undefined;

  const {
    data,
    isLoading,
    isFetching: chartFetching,
    error,
    refetch,
  } = useArtistTrendsChart(
    startDate,
    endDate,
    period,
    artistIdsForFetch,
    undefined,
    userId
  );

  useEffect(() => {
    setSelectionDebounceMs(0);
  }, [startDate, endDate, period]);

  useEffect(() => {
    if (!chartFetching && data != null && !error) {
      setSelectionDebounceMs(ARTIST_SELECTION_DEBOUNCE_MS);
    }
  }, [chartFetching, data, error]);

  const chartDataSyncing = chartFetching || selectionPending;

  const pickerArtists = useMemo(() => {
    const base = data?.catalogArtists ?? data?.availableArtists ?? [];
    const merged = new Map<string, ArtistTrendsChartArtist>();
    for (const a of base) merged.set(a.id, a);
    for (const a of extraSearchArtists) merged.set(a.id, a);
    return Array.from(merged.values());
  }, [data?.catalogArtists, data?.availableArtists, extraSearchArtists]);

  useEffect(() => {
    const cat = data?.catalogArtists;
    if (!cat?.length) return;
    setExtraSearchArtists((prev) => {
      const ids = new Set(cat.map((a) => a.id));
      return prev.filter((p) => !ids.has(p.id));
    });
  }, [data?.catalogArtists]);

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of pickerArtists) m.set(a.id, a.name);
    for (const a of data?.availableArtists ?? []) {
      if (!m.has(a.id)) m.set(a.id, a.name);
    }
    return m;
  }, [pickerArtists, data?.availableArtists]);

  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedIds),
    [chartData, chartView, selectedIds]
  );

  const defaultSourceIds = useMemo(() => {
    const src = data?.catalogArtists ?? data?.availableArtists;
    return src?.map((a) => a.id) ?? [];
  }, [data?.catalogArtists, data?.availableArtists]);

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setSelectedIds((prev) => {
      const next = nextDefaultTrendSelection({
        selectionTouched: false,
        chartFetching,
        catalogIds: defaultSourceIds,
        currentIds: prev,
      });
      return next ?? prev;
    });
  }, [startDate, endDate, chartFetching, defaultSourceIds]);

  const toggleArtist = useCallback((id: string) => {
    selectionTouchedRef.current = true;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, id];
    });
  }, []);

  const handlePickRemoteArtist = useCallback((artist: ArtistTrendsChartArtist) => {
    selectionTouchedRef.current = true;
    setExtraSearchArtists((prev) => {
      if (prev.some((p) => p.id === artist.id)) return prev;
      return [...prev, artist];
    });
    setSelectedIds((prev) => {
      if (prev.includes(artist.id)) return prev;
      if (prev.length >= MAX_SERIES_ARTISTS) return prev;
      return [...prev, artist.id];
    });
  }, []);

  const selectAll = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedIds(pickerArtists.slice(0, MAX_SERIES_ARTISTS).map((a) => a.id));
  }, [pickerArtists]);

  const selectNone = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedIds([]);
  }, []);

  const getArtistIndex = useCallback(
    (artistId: string) => pickerArtists.findIndex((a) => a.id === artistId),
    [pickerArtists]
  );

  const chartSeries = useMemo(
    () =>
      selectedIds.map((artistId) => {
        const idx = getArtistIndex(artistId);
        return {
          dataKey: artistId,
          name: idToName.get(artistId) ?? artistId,
          color: getColor(idx >= 0 ? idx : 0),
        };
      }),
    [getArtistIndex, getColor, idToName, selectedIds]
  );

  const commentaryQueryEnabled =
    debouncedSelectedIds.length > 0 &&
    chartData.length > 0 &&
    !isLoading &&
    !error;

  const {
    data: lightAi,
    isLoading: lightAiLoading,
    isFetching: lightAiFetching,
    error: lightAiError,
  } = useArtistTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedIds,
    userId,
    {
      mode: "light",
      enabled: commentaryQueryEnabled,
    }
  );

  const {
    data: techAi,
    isLoading: techAiLoading,
    isFetching: techAiFetching,
    error: techAiError,
  } = useArtistTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedIds,
    userId,
    {
      mode: "technical",
      enabled: commentaryQueryEnabled && summaryVersion === "technical",
    }
  );

  const aiCommentary = useMemo(
    () => ({
      commentary: techAi?.commentary ?? null,
      commentaryLight: lightAi?.commentaryLight ?? null,
      commentaryCached: techAi?.commentaryCached,
      commentaryLightCached: lightAi?.commentaryLightCached,
      aiUnavailable: techAi?.aiUnavailable ?? lightAi?.aiUnavailable,
      aiUnavailableReason: techAi?.aiUnavailableReason ?? lightAi?.aiUnavailableReason,
    }),
    [techAi, lightAi]
  );

  const showAiSkeleton =
    (summaryVersion === "light" &&
      !lightAi?.commentaryLight &&
      !lightAi?.aiUnavailable &&
      (lightAiLoading || lightAiFetching)) ||
    (summaryVersion === "technical" &&
      !techAi?.commentary &&
      !techAi?.aiUnavailable &&
      (techAiLoading || techAiFetching));

  const displayAiCommentary =
    summaryVersion === "light"
      ? (aiCommentary?.commentaryLight ?? "")
      : (aiCommentary?.commentary ?? "");

  const hasDisplayableAiParagraph = displayAiCommentary.trim().length > 0;

  const aiRefreshing =
    !aiCommentary?.aiUnavailable &&
    hasDisplayableAiParagraph &&
    ((summaryVersion === "light" && lightAiFetching) ||
      (summaryVersion === "technical" && techAiFetching));

  const activeAiError =
    summaryVersion === "technical" ? techAiError : lightAiError;

  const masthead = (
    <>
      <ArtistTrendsMasthead artistsHref={artistsHref} subtitleKey="subtitleExtended" />
      <ArtistTrendsMetricStrip
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
          <ArtistTrendsMobileError error={error} onRetry={() => refetch()} />
        </div>
        <div className="mt-6 hidden space-y-8 lg:block">
          {masthead}
          <ArtistsViewSwitcher idPrefix="artist-trends-desktop" activeSection="trends" />
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!isLoading && (!data || (chartData.length === 0 && pickerArtists.length === 0))) {
    return (
      <>
        <div className={DASHBOARD_CHART_CONTROLS_ROW}>
          <PeriodSelector defaultPeriod="month" value={period} />
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
        <div className="lg:hidden">
          <ArtistTrendsMobileEmpty artistsHref={artistsHref} />
        </div>
        <div className="mt-6 hidden space-y-8 lg:block">
          {masthead}
          <ArtistsViewSwitcher idPrefix="artist-trends-desktop-empty" activeSection="trends" />
          <EmptyState
            variant="startup"
            {...emptyStatePresets.changeDates(pathname)}
            message={t("noArtistData")}
            description={t("changeDatesDescription")}
          />
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
        <ArtistTrendsMobileExperience
          artistsHref={artistsHref}
          period={period}
          selectedIds={selectedIds}
          pickerArtists={pickerArtists}
          chartData={chartData}
          chartDisplayData={displayChartData}
          isLoading={isLoading}
          isUpdating={chartFetching || selectionPending}
          idToName={idToName}
          getArtistIndex={getArtistIndex}
          getColor={getColor}
          toggleArtist={toggleArtist}
          selectAll={selectAll}
          selectNone={selectNone}
          handlePickRemoteArtist={handlePickRemoteArtist}
          maxSelectable={MAX_SERIES_ARTISTS}
          chartView={chartView}
          setChartView={setChartView}
          aiVisible={debouncedSelectedIds.length > 0 && chartData.length > 0}
          summaryVersion={summaryVersion}
          setSummaryVersion={setSummaryVersion}
          showAiSkeleton={showAiSkeleton}
          activeAiError={activeAiError}
          aiUnavailable={Boolean(aiCommentary?.aiUnavailable)}
          aiUnavailableReason={aiCommentary?.aiUnavailableReason}
          hasDisplayableAiParagraph={hasDisplayableAiParagraph}
          displayAiCommentary={displayAiCommentary}
          aiRefreshing={aiRefreshing}
          commentaryCached={Boolean(
            (summaryVersion === "technical" && aiCommentary?.commentaryCached) ||
              (summaryVersion === "light" && aiCommentary?.commentaryLightCached)
          )}
        />
      </div>

      <div className="mt-6 hidden space-y-8 lg:block">
        {masthead}

        <ArtistsViewSwitcher idPrefix="artist-trends-desktop" activeSection="trends" />

        <div className="space-y-12">
          <section className="relative animate-fade-in-up">
            <ArtistTrendsSectionHeader
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
              <ArtistPickerSkeleton />
            ) : (
              <ArtistTrendsArtistPicker
                catalogArtists={pickerArtists}
                selectedIds={selectedIds}
                onToggle={toggleArtist}
                getColor={getColor}
                getArtistIndex={getArtistIndex}
                enableRemoteSearch
                onPickRemoteArtist={handlePickRemoteArtist}
                maxSelectable={MAX_SERIES_ARTISTS}
              />
            )}
          </section>

          <section
            className="relative animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
            aria-labelledby="artist-trends-chart-title"
          >
            <ArtistTrendsSectionHeader
              eyebrow={t("sections.chart.eyebrow")}
              title={t("sections.chart.title")}
              description={t("sections.chart.description")}
            />
            <p id="artist-trends-chart-title" className="sr-only">
              {t("evolution")}
            </p>
            <p className="mb-4 text-[13px] text-muted">
              {t("selectionCount", { selected: selectedIds.length, max: MAX_SERIES_ARTISTS })}
            </p>
            {isLoading ? (
              <ArtistTrendsChartSkeleton />
            ) : selectedIds.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted">{t("selectAtLeastOne")}</p>
            ) : (
              <div className="relative min-h-[280px] lg:min-h-[500px]" aria-busy={chartDataSyncing}>
                {chartDataSyncing && (
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
                  className={`transition-opacity duration-200 ${chartDataSyncing ? "pointer-events-none opacity-40" : ""}`}
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

          {debouncedSelectedIds.length > 0 && chartData.length > 0 && (
            <section
              className="animate-fade-in-up"
              aria-labelledby="artist-trends-ai-spotlight-title"
              aria-busy={aiRefreshing}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className={DASHBOARD_SECTION_EYEBROW}>{t("aiSpotlightEyebrow")}</p>
                  <h2
                    id="artist-trends-ai-spotlight-title"
                    className={`${DASHBOARD_SECTION_TITLE} mt-1`}
                  >
                    {t("aiSpotlightTitle")}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">
                    {t("aiSpotlightHint")}
                    {displayAiCommentary &&
                      ((summaryVersion === "technical" &&
                        aiCommentary?.commentaryCached) ||
                        (summaryVersion === "light" &&
                          aiCommentary?.commentaryLightCached)) && (
                        <span className="ml-1 text-muted">{t("aiCached")}</span>
                      )}
                    {aiRefreshing && (
                      <span className="ml-2 inline-flex items-center gap-1.5 text-muted">
                        <span
                          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                          aria-hidden
                        />
                        <span>{t("aiUpdating")}</span>
                      </span>
                    )}
                  </p>
                </div>
                {(aiCommentary?.commentaryLight || aiCommentary?.commentary) && (
                  <div
                    className="flex shrink-0 rounded-xl border border-border bg-surface/60 p-1"
                    role="tablist"
                    aria-label={t("aiExplanation")}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={summaryVersion === "light"}
                      aria-busy={
                        summaryVersion === "light" &&
                        (lightAiLoading || lightAiFetching)
                      }
                      onClick={() => setSummaryVersion("light")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        summaryVersion === "light"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {t("summaryVersionLight")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={summaryVersion === "technical"}
                      aria-busy={
                        summaryVersion === "technical" &&
                        (techAiLoading || techAiFetching)
                      }
                      onClick={() => setSummaryVersion("technical")}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        summaryVersion === "technical"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {t("summaryVersionTechnical")}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-6">
                {showAiSkeleton ? (
                  <div className="space-y-3 animate-pulse" aria-busy="true">
                    <div className="h-4 w-full max-w-3xl rounded bg-black/10 dark:bg-white/10" />
                    <div className="h-4 w-full max-w-2xl rounded bg-black/10 dark:bg-white/10" />
                    <div className="h-4 w-4/5 max-w-xl rounded bg-black/10 dark:bg-white/10" />
                  </div>
                ) : activeAiError ? (
                  isGroqDailyQuotaError(activeAiError) ? (
                    <GroqQuotaNotice error={activeAiError} />
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                      {activeAiError.message}
                    </p>
                  )
                ) : aiCommentary?.aiUnavailable ? (
                  <AiUnavailableCta reason={aiCommentary.aiUnavailableReason ?? "consent"} />
                ) : hasDisplayableAiParagraph ? (
                  <p
                    className={`whitespace-pre-line text-base leading-relaxed text-foreground transition-opacity duration-200 sm:text-[1.05rem] ${
                      aiRefreshing ? "opacity-60" : ""
                    }`}
                  >
                    {displayAiCommentary}
                  </p>
                ) : (
                  <p className="text-sm text-muted">{t("aiEmpty")}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function ArtistTrendsFallback() {
  const searchParams = useSearchParams();
  const period = getPeriodFromSearchParams(searchParams, "month");
  const artistsHref = useArtistsListHref();

  return (
    <>
      <div className={DASHBOARD_CHART_CONTROLS_ROW}>
        <div className="h-11 w-64 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
      </div>
      <div className="mt-6">
        <div className="lg:hidden">
          <ArtistTrendsMobileSkeleton />
        </div>
        <div className="hidden space-y-8 lg:block">
          <ArtistTrendsMasthead artistsHref={artistsHref} subtitleKey="subtitle" />
          <ArtistTrendsMetricStrip period={period} selectedCount={0} loading />
          <ArtistsViewSwitcher idPrefix="artist-trends-desktop-fallback" activeSection="trends" />
          <GenreTrendsSkeleton />
        </div>
      </div>
    </>
  );
}

export default function ArtistTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<ArtistTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
