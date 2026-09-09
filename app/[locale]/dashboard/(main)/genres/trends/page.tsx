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
import { useGenreTrends, useGenreTrendsCommentary } from "@/lib/hooks/use-listening";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { GenreAccuracyChooser } from "@/lib/components/palette/genre-accuracy-chooser";
import { GenresSectionSwitcher } from "@/lib/components/genres-section-switcher";
import {
  GenreTrendsMobileEmpty,
  GenreTrendsMobileError,
  GenreTrendsMobileExperience,
  GenreTrendsMobileSkeleton,
} from "@/lib/components/genre-trends-mobile";
import { PeriodSelector, getPeriodFromSearchParams, type PeriodType } from "@/lib/components/period-selector";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  applyListenTrendChartViewMulti,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";
import { nextDefaultTrendSelection } from "@/lib/utils/listen-trend-default-selection";
import { GenreTrendsSkeleton } from "@/lib/components/skeleton-loaders";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ArrowLeft } from "lucide-react";
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

const DEFAULT_SERIES_GENRES = 2;
const MAX_SERIES_GENRES = 30;
const GENRE_FILTER_PAGE_SIZE = 30;
/** Délai après lequel les sélections de genres déclenchent refetch chart + IA (évite rafales). */
const GENRE_SELECTION_DEBOUNCE_MS = 450;

function useGenresListHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const qs = params.toString();
    return qs ? `/dashboard/genres?${qs}` : "/dashboard/genres";
  }, [searchParams]);
}

function periodToLabelKey(period: PeriodType): "daily" | "weekly" | "monthly" {
  if (period === "day") return "daily";
  if (period === "week") return "weekly";
  return "monthly";
}

function GenreTrendsSectionHeader({
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

function GenreTrendsMetricStrip({
  period,
  selectedCount,
  loading = false,
}: {
  period: PeriodType;
  selectedCount: number;
  loading?: boolean;
}) {
  const t = useTranslations("genreTrends");
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
            {selectedCount} / {MAX_SERIES_GENRES}
          </span>
        )}
      </div>
    </div>
  );
}

function GenreTrendsMasthead({
  genresHref,
  subtitleKey,
}: {
  genresHref: string;
  subtitleKey: "subtitle" | "subtitleExtended";
}) {
  const t = useTranslations("genreTrends");
  return (
    <div className="space-y-4">
      <OverviewHeroFrame title={t("title")} description={t(subtitleKey)} />
      <Link href={genresHref} className={`${DASHBOARD_BTN_GHOST} gap-2`}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToGenres")}
      </Link>
    </div>
  );
}

function GenreFilterSkeleton() {
  return (
    <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-card-border bg-surface/60 p-2" aria-busy="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <div
          key={index}
          className="h-9 rounded-lg border border-slate-200/80 bg-slate-100/80 animate-shimmer dark:border-white/10 dark:bg-white/[0.06]"
          style={{ width: `${84 + ((index * 17) % 82)}px` }}
        />
      ))}
    </div>
  );
}

function GenreTrendsChartSkeleton() {
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

function genresEqualSorted(a: string[], b: string[]): boolean {
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
  const t = useTranslations("genreTrends");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = getPeriodFromSearchParams(searchParams, "month");

  // Quand "All" est sélectionné (pas de dates dans l'URL), passer undefined
  // pour que l'API utilise la plage réelle min/max de la DB
  const startDate = startDateParam || undefined;
  const endDate = endDateParam || undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const genresHref = useGenresListHref();

  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listensDelta")}`,
    [locale, t]
  );

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [summaryVersion, setSummaryVersion] = useState<"light" | "technical">(
    "light"
  );
  const [genreFilterPage, setGenreFilterPage] = useState(0);
  const selectionTouchedRef = useRef(false);

  /** 0 ms jusqu’à la première réponse chart — pas de délai au premier rendu des sélections par défaut. */
  const [selectionDebounceMs, setSelectionDebounceMs] = useState(0);
  const debouncedSelectedGenres = useDebouncedValue(
    selectedGenres,
    selectionDebounceMs
  );
  const selectionPending = !genresEqualSorted(
    selectedGenres,
    debouncedSelectedGenres
  );

  const genresForFetch =
    debouncedSelectedGenres.length > 0 ? debouncedSelectedGenres : undefined;

  const { data, isLoading, isFetching: chartFetching, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    period,
    genresForFetch,
    userId
  );

  useEffect(() => {
    setSelectionDebounceMs(0);
  }, [startDate, endDate, period]);

  useEffect(() => {
    if (!chartFetching && data != null && !error) {
      setSelectionDebounceMs(GENRE_SELECTION_DEBOUNCE_MS);
    }
  }, [chartFetching, data, error]);

  const chartDataSyncing = chartFetching || selectionPending;

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const chartData = useMemo(() => data?.data ?? [], [data?.data]);
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const displayChartData = useMemo(
    () => applyListenTrendChartViewMulti(chartData, chartView, selectedGenres),
    [chartData, chartView, selectedGenres]
  );

  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setSelectedGenres((prev) => {
      const next = nextDefaultTrendSelection({
        selectionTouched: false,
        chartFetching,
        catalogIds: availableGenres,
        currentIds: prev,
        max: DEFAULT_SERIES_GENRES,
      });
      return next ?? prev;
    });
  }, [startDate, endDate, chartFetching, availableGenres]);

  const genreFilterPageCount = Math.max(
    1,
    Math.ceil(availableGenres.length / GENRE_FILTER_PAGE_SIZE)
  );
  const visibleGenreStart = genreFilterPage * GENRE_FILTER_PAGE_SIZE;
  const visibleGenres = useMemo(
    () =>
      availableGenres.slice(
        visibleGenreStart,
        visibleGenreStart + GENRE_FILTER_PAGE_SIZE
      ),
    [availableGenres, visibleGenreStart]
  );
  const visibleGenreEnd = Math.min(
    visibleGenreStart + visibleGenres.length,
    availableGenres.length
  );

  useEffect(() => {
    setGenreFilterPage(0);
  }, [availableGenres]);

  useEffect(() => {
    if (genreFilterPage >= genreFilterPageCount) {
      setGenreFilterPage(genreFilterPageCount - 1);
    }
  }, [genreFilterPage, genreFilterPageCount]);

  const toggleGenre = useCallback((genre: string) => {
    selectionTouchedRef.current = true;
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= MAX_SERIES_GENRES) return prev;
      return [...prev, genre];
    });
  }, []);

  const selectAll = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedGenres(visibleGenres.slice(0, MAX_SERIES_GENRES));
  }, [visibleGenres]);

  const selectAllMobile = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedGenres(availableGenres.slice(0, MAX_SERIES_GENRES));
  }, [availableGenres]);

  const selectNone = useCallback(() => {
    selectionTouchedRef.current = true;
    setSelectedGenres([]);
  }, []);

  const chartSeries = useMemo(
    () =>
      selectedGenres.map((genre) => {
        const idx = availableGenres.indexOf(genre);
        return {
          dataKey: genre,
          name: genre,
          color: getColor(idx >= 0 ? idx : 0),
        };
      }),
    [availableGenres, getColor, selectedGenres]
  );

  const commentaryQueryEnabled =
    debouncedSelectedGenres.length > 0 &&
    chartData.length > 0 &&
    !isLoading &&
    !error;

  /** Résumé naturel par défaut : `mode=light` (un Groq par requête HTTP). */
  const {
    data: lightAi,
    isLoading: lightAiLoading,
    isFetching: lightAiFetching,
    error: lightAiError,
  } = useGenreTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedGenres,
    userId,
    {
      mode: "light",
      enabled: commentaryQueryEnabled,
    }
  );

  /** Variante détaillée : chargée seulement si l’utilisateur choisit l’onglet technique. */
  const {
    data: techAi,
    isLoading: techAiLoading,
    isFetching: techAiFetching,
    error: techAiError,
  } = useGenreTrendsCommentary(
    startDate,
    endDate,
    period,
    debouncedSelectedGenres,
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

  const activeAiError =
    summaryVersion === "technical" ? techAiError : lightAiError;

  const aiRefreshing =
    !aiCommentary?.aiUnavailable &&
    hasDisplayableAiParagraph &&
    ((summaryVersion === "light" && lightAiFetching) ||
      (summaryVersion === "technical" && techAiFetching));

  const masthead = (
    <>
      <GenreTrendsMasthead genresHref={genresHref} subtitleKey="subtitleExtended" />
      <GenreTrendsMetricStrip
        period={period}
        selectedCount={selectedGenres.length}
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
          <GenreTrendsMobileError error={error} onRetry={() => refetch()} />
        </div>
        <div className="mt-6 hidden space-y-8 lg:block">
          {masthead}
          <GenresSectionSwitcher idPrefix="genre-trends-desktop" activeSection="trends" />
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

  if (!isLoading && (!data || (chartData.length === 0 && availableGenres.length === 0))) {
    return (
      <>
        <div className={DASHBOARD_CHART_CONTROLS_ROW}>
          <PeriodSelector defaultPeriod="month" value={period} />
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
        </div>
        <div className="lg:hidden">
          <GenreTrendsMobileEmpty genresHref={genresHref} />
        </div>
        <div className="mt-6 hidden space-y-8 lg:block">
          {masthead}
          <GenresSectionSwitcher idPrefix="genre-trends-desktop-empty" activeSection="trends" />
          <EmptyState
            variant="startup"
            {...emptyStatePresets.changeDates(pathname)}
            message={t("noGenreData")}
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
        <GenreTrendsMobileExperience
          genresHref={genresHref}
          period={period}
          selectedGenres={selectedGenres}
          availableGenres={availableGenres}
          chartData={chartData}
          chartDisplayData={displayChartData}
          isLoading={isLoading}
          isUpdating={chartFetching || selectionPending}
          getColor={getColor}
          toggleGenre={toggleGenre}
          selectAll={selectAllMobile}
          selectNone={selectNone}
          maxSelectable={MAX_SERIES_GENRES}
          chartView={chartView}
          setChartView={setChartView}
          aiVisible={debouncedSelectedGenres.length > 0 && chartData.length > 0}
          summaryVersion={summaryVersion}
          setSummaryVersion={setSummaryVersion}
          showAiSkeleton={showAiSkeleton}
          activeAiError={activeAiError}
          aiUnavailable={Boolean(aiCommentary?.aiUnavailable)}
          aiUnavailableReason={aiCommentary?.aiUnavailableReason}
          hasDisplayableAiParagraph={hasDisplayableAiParagraph}
          displayAiCommentary={displayAiCommentary}
          aiRefreshing={aiRefreshing}
        />
      </div>

      <div className="mt-6 hidden space-y-8 lg:block">
        {masthead}
        <GenresSectionSwitcher idPrefix="genre-trends-desktop" activeSection="trends" />
        {!isPublicDemoViewer ? <GenreAccuracyChooser viewerUserId={userId} className="max-w-3xl" /> : null}

        <div className="space-y-12">
          <section className="relative animate-fade-in-up">
            <GenreTrendsSectionHeader
              eyebrow={t("sections.picker.eyebrow")}
              title={t("sections.picker.title")}
              description={t("sections.picker.description")}
            />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-muted">{t("sections.picker.badge")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] tabular-nums text-muted">
                  {t("selectionCount", {
                    selected: selectedGenres.length,
                    max: MAX_SERIES_GENRES,
                  })}
                </span>
                <button type="button" onClick={selectAll} className={DASHBOARD_BTN_GHOST}>
                  {t("all")}
                </button>
                <button type="button" onClick={selectNone} className={DASHBOARD_BTN_GHOST}>
                  {t("none")}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {availableGenres.length > GENRE_FILTER_PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[13px] text-muted">
                    <span>
                      {t("paginationSummary", {
                        start: visibleGenreStart + 1,
                        end: visibleGenreEnd,
                        total: availableGenres.length,
                      })}
                    </span>
                    <span className="ml-2">
                      {t("paginationPage", {
                        page: genreFilterPage + 1,
                        totalPages: genreFilterPageCount,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGenreFilterPage((page) => Math.max(0, page - 1))}
                      disabled={genreFilterPage === 0}
                      className={`${DASHBOARD_BTN_GHOST} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {t("paginationPrevious")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setGenreFilterPage((page) =>
                          Math.min(genreFilterPageCount - 1, page + 1)
                        )
                      }
                      disabled={genreFilterPage >= genreFilterPageCount - 1}
                      className={`${DASHBOARD_BTN_GHOST} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {t("paginationNext")}
                    </button>
                  </div>
                </div>
              )}
              {isLoading ? (
                <GenreFilterSkeleton />
              ) : (
                <div className="flex max-h-[min(50vh,22rem)] flex-wrap content-start gap-2 overflow-y-auto rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-surface/60">
                  {visibleGenres.map((genre) => {
                    const selected = selectedGenres.includes(genre);
                    const disabled = !selected && selectedGenres.length >= MAX_SERIES_GENRES;
                    const idx = availableGenres.indexOf(genre);
                    return (
                      <label
                        key={genre}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
                          selected
                            ? "border-violet-400/65 bg-violet-100 text-violet-950 shadow-sm dark:border-violet-400/55 dark:bg-slate-950 dark:text-violet-100 dark:shadow-none"
                            : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/12 dark:bg-card-surface dark:text-foreground dark:hover:bg-white/[0.06]"
                        } ${
                          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => toggleGenre(genre)}
                          className="rounded border-slate-300 bg-violet-50 text-violet-600 accent-violet-600 focus:ring-violet-500 disabled:opacity-40 dark:border-white/25 dark:bg-slate-900 dark:accent-violet-400"
                        />
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor: selected ? getColor(idx) : "transparent",
                            border: selected ? "none" : "1px solid #9ca3af",
                          }}
                        />
                        <span className="text-sm text-inherit">{genre}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section
            className="relative animate-fade-in-up"
            style={{ animationDelay: "60ms" }}
            aria-labelledby="genre-trends-chart-title"
          >
            <GenreTrendsSectionHeader
              eyebrow={t("sections.chart.eyebrow")}
              title={t("sections.chart.title")}
              description={t("sections.chart.description")}
            />
            <p id="genre-trends-chart-title" className="sr-only">
              {t("evolution")}
            </p>
            <p className="mb-4 text-[13px] text-muted">
              {t("selectionCount", { selected: selectedGenres.length, max: MAX_SERIES_GENRES })}
            </p>
            {isLoading ? (
              <GenreTrendsChartSkeleton />
            ) : selectedGenres.length === 0 ? (
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

          {debouncedSelectedGenres.length > 0 && chartData.length > 0 && (
            <section
              className="animate-fade-in-up"
              aria-labelledby="genre-trends-ai-spotlight-title"
              aria-busy={aiRefreshing}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className={DASHBOARD_SECTION_EYEBROW}>{t("aiSpotlightEyebrow")}</p>
                  <h2
                    id="genre-trends-ai-spotlight-title"
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

function GenreTrendsFallback() {
  const searchParams = useSearchParams();
  const period = getPeriodFromSearchParams(searchParams, "month");
  const genresHref = useGenresListHref();
  return (
    <>
      <div className={DASHBOARD_CHART_CONTROLS_ROW}>
        <div className="h-11 w-64 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
      </div>
      <div className="mt-5 lg:hidden">
        <GenreTrendsMobileSkeleton />
      </div>
      <div className="mt-6 hidden space-y-8 lg:block">
        <GenreTrendsMasthead genresHref={genresHref} subtitleKey="subtitle" />
        <GenreTrendsMetricStrip period={period} selectedCount={0} loading />
        <GenresSectionSwitcher idPrefix="genre-trends-desktop-fallback" activeSection="trends" />
        <GenreTrendsSkeleton />
      </div>
    </>
  );
}

export default function GenreTrendsPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<GenreTrendsFallback />}>
        <TrendsContent />
      </Suspense>
    </div>
  );
}
