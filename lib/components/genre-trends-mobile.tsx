"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { AiUnavailableCta } from "@/lib/components/ai-unavailable-cta";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import {
  TRENDS_MOBILE_BLEED,
  TRENDS_MOBILE_SNAP,
  TrendsMobileActionRow,
  TrendsMobileDestinationRow,
  TrendsMobileEmpty,
  TrendsMobileError,
  TrendsMobileHero,
  TrendsMobileLegendRow,
  TrendsMobileSheetHeader,
  TrendsMobileSignalTile,
  TrendsMobileSkeleton,
} from "@/lib/components/trends-mobile-hub";
import { numericTrendValue, TrendsMobileSpark } from "@/lib/components/trends-mobile-spark";
import type { AiUnavailableReason } from "@/lib/dto/ai-insights";
import type { GenreTrendsDataPoint } from "@/lib/dto/genres";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import type { ListenTrendChartViewMode } from "@/lib/utils/listen-trend-chart-view";

const VISIBLE_SERIES = 5;

type GenreTrendSignal = {
  id: string;
  label: string;
  color: string;
  total: number;
  delta: number;
  peak: number;
  peakDate: string;
};

function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function buildGenreTrendSignals({
  chartData,
  selectedGenres,
  getColor,
}: {
  chartData: GenreTrendsDataPoint[];
  selectedGenres: string[];
  getColor: (index: number) => string;
}): GenreTrendSignal[] {
  return selectedGenres
    .map((genre, index) => {
      let total = 0;
      let peak = 0;
      let peakDate = "";
      chartData.forEach((point) => {
        const value = numericTrendValue(point, genre);
        total += value;
        if (value > peak) {
          peak = value;
          peakDate = String(point.formattedDate || point.date || "");
        }
      });
      const first = chartData[0] ? numericTrendValue(chartData[0], genre) : 0;
      const last = chartData[chartData.length - 1]
        ? numericTrendValue(chartData[chartData.length - 1], genre)
        : 0;
      return {
        id: genre,
        label: genre,
        color: getColor(index),
        total,
        delta: last - first,
        peak,
        peakDate,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function GenreTrendsMobileEmpty({
  genresHref,
}: {
  genresHref: string;
}) {
  const locale = useLocale();
  const t = useTranslations("genreTrends");

  return (
    <TrendsMobileEmpty
      locale={locale}
      eyebrow={t("mobile.eyebrow")}
      title={t("mobile.emptyTitle")}
      lead={t("mobile.emptyLead")}
      leaderboardHref={genresHref}
      leaderboardTitle={t("backToGenres")}
      leaderboardLead={t("mobile.leaderboardLead")}
    />
  );
}

export function GenreTrendsMobileError({
  error,
  onRetry,
}: {
  error?: Error | null;
  onRetry: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("genreTrends");

  return (
    <TrendsMobileError
      locale={locale}
      eyebrow={t("mobile.eyebrow")}
      heading={t("mobile.errorLead")}
      error={error}
      onRetry={onRetry}
    />
  );
}

export { TrendsMobileSkeleton as GenreTrendsMobileSkeleton };

export function GenreTrendsMobileExperience({
  genresHref,
  period,
  selectedGenres,
  availableGenres,
  chartData,
  chartDisplayData,
  isLoading,
  isUpdating,
  getColor,
  toggleGenre,
  selectAll,
  selectNone,
  maxSelectable,
  chartView,
  setChartView,
  aiVisible,
  summaryVersion,
  setSummaryVersion,
  showAiSkeleton,
  activeAiError,
  aiUnavailable,
  aiUnavailableReason,
  hasDisplayableAiParagraph,
  displayAiCommentary,
  aiRefreshing,
}: {
  genresHref: string;
  period: PeriodType;
  selectedGenres: string[];
  availableGenres: string[];
  chartData: GenreTrendsDataPoint[];
  chartDisplayData: GenreTrendsDataPoint[];
  isLoading: boolean;
  isUpdating: boolean;
  getColor: (index: number) => string;
  toggleGenre: (genre: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  maxSelectable: number;
  chartView: ListenTrendChartViewMode;
  setChartView: (mode: ListenTrendChartViewMode) => void;
  aiVisible: boolean;
  summaryVersion: "light" | "technical";
  setSummaryVersion: (version: "light" | "technical") => void;
  showAiSkeleton: boolean;
  activeAiError: Error | null;
  aiUnavailable: boolean;
  aiUnavailableReason?: AiUnavailableReason;
  hasDisplayableAiParagraph: boolean;
  displayAiCommentary: string;
  aiRefreshing: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("genreTrends");
  const tPeriod = useTranslations("components.periodSelector");
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const [query, setQuery] = useState("");
  const compareTitleId = useId();
  const patternTitleId = useId();
  const searchId = useId();

  const colorByGenre = useMemo(() => {
    const map = new Map<string, string>();
    availableGenres.forEach((genre, index) => {
      map.set(genre, getColor(index));
    });
    return map;
  }, [availableGenres, getColor]);

  const signals = useMemo(
    () =>
      buildGenreTrendSignals({
        chartData,
        selectedGenres,
        getColor: (index) => {
          const genre = selectedGenres[index];
          return (genre ? colorByGenre.get(genre) : undefined) ?? getColor(index);
        },
      }),
    [chartData, colorByGenre, getColor, selectedGenres],
  );
  const visibleSignals = signals.slice(0, VISIBLE_SERIES);
  const leadSignal = signals[0];
  const movementSignal = signals.reduce<GenreTrendSignal | undefined>((best, signal) => {
    if (!best) return signal;
    return Math.abs(signal.delta) > Math.abs(best.delta) ? signal : best;
  }, undefined);

  const sparkSeries = useMemo(
    () =>
      visibleSignals.map((signal) => ({
        id: signal.id,
        color: signal.color,
        values: chartDisplayData.map((point) => numericTrendValue(point, signal.id)),
      })),
    [chartDisplayData, visibleSignals],
  );

  const filteredGenres = useMemo(() => {
    const needle = normalizeForSearch(query);
    if (!needle) return availableGenres;
    return availableGenres.filter((genre) => normalizeForSearch(genre).includes(needle));
  }, [availableGenres, query]);

  const periodLabelKey = period === "day" ? "daily" : period === "week" ? "weekly" : "monthly";
  const startLabel = chartDisplayData[0]?.formattedDate;
  const endLabel = chartDisplayData[chartDisplayData.length - 1]?.formattedDate;
  const movementHint = movementSignal
    ? movementSignal.delta > 0
      ? t("mobile.deltaUp", { count: numberFormatter.format(movementSignal.delta) })
      : movementSignal.delta < 0
        ? t("mobile.deltaDown", { count: numberFormatter.format(Math.abs(movementSignal.delta)) })
        : t("mobile.deltaFlat")
    : undefined;

  if (isLoading) return <TrendsMobileSkeleton />;

  return (
    <div className={TRENDS_MOBILE_BLEED}>
      <TrendsMobileHero
        locale={locale}
        eyebrow={t("mobile.eyebrow")}
        heading={leadSignal?.label ?? t("mobile.emptyTitle")}
        listenLabel={
          leadSignal
            ? t("mobile.listenCount", { count: numberFormatter.format(leadSignal.total) })
            : undefined
        }
        peakLabel={
          leadSignal
            ? leadSignal.peak > 0
              ? t("mobile.peakLine", {
                  count: numberFormatter.format(leadSignal.peak),
                  date: leadSignal.peakDate,
                })
              : t("mobile.noPeak")
            : undefined
        }
      />

      <section className="px-4" aria-label={tPeriod("label")}>
        <PeriodSelector defaultPeriod="month" value={period} variant="compact" />
      </section>

      <section aria-label={t("mobile.signalsLabel")} className="px-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.signalsLabel")}
        </p>
        <div className={TRENDS_MOBILE_SNAP}>
          <TrendsMobileSignalTile
            label={t("mobile.selectedSignal")}
            value={String(selectedGenres.length)}
          />
          <TrendsMobileSignalTile
            label={t("mobile.moverSignal")}
            value={movementSignal?.label ?? t("mobile.noMover")}
            hint={movementHint}
          />
          <TrendsMobileSignalTile label={t("mobile.periodSignal")} value={tPeriod(periodLabelKey)} />
        </div>
      </section>

      <section className="space-y-2 px-4" aria-busy={isUpdating}>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.sparkTitle")}
        </h2>
        {visibleSignals.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-card-border px-4 py-6 text-sm text-muted">
            {t("selectAtLeastOne")}
          </p>
        ) : (
          <TrendsMobileSpark
            series={sparkSeries}
            ariaLabel={t("mobile.sparkAria")}
            startLabel={typeof startLabel === "string" ? startLabel : undefined}
            endLabel={typeof endLabel === "string" ? endLabel : undefined}
          />
        )}
        <div className="space-y-2">
          {visibleSignals.map((signal, index) => (
            <TrendsMobileLegendRow
              key={signal.id}
              color={signal.color}
              rank={index + 1}
              label={signal.label}
              meta={t("mobile.listenCount", { count: numberFormatter.format(signal.total) })}
            />
          ))}
        </div>
      </section>

      <section className="space-y-2 px-4">
        <TrendsMobileDestinationRow
          href={genresHref}
          title={t("backToGenres")}
          lead={t("mobile.leaderboardLead")}
        />
        <TrendsMobileActionRow
          title={t("mobile.compareTitle")}
          lead={t("mobile.compareLead")}
          onClick={() => setCompareOpen(true)}
        />
        {aiVisible ? (
          <TrendsMobileActionRow
            title={t("mobile.patternTitle")}
            lead={t("mobile.patternLead")}
            onClick={() => setPatternOpen(true)}
          />
        ) : null}
      </section>

      <MobileBottomSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        ariaLabelledBy={compareTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-8 pt-1">
          <TrendsMobileSheetHeader
            titleId={compareTitleId}
            title={t("mobile.compareSheetTitle")}
            onClose={() => setCompareOpen(false)}
          />
          <div className="mb-4">
            <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          </div>
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="min-h-11 flex-1 rounded-2xl border border-violet-200/80 bg-white px-4 text-sm font-semibold text-violet-950 shadow-sm dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100"
            >
              {t("all")}
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground"
            >
              {t("none")}
            </button>
          </div>
          <label htmlFor={searchId} className="sr-only">
            {t("mobile.searchPlaceholder")}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("mobile.searchPlaceholder")}
            className="mb-3 min-h-11 w-full rounded-2xl border border-card-border bg-surface px-3.5 text-sm text-foreground"
          />
          <ul className="max-h-[min(48vh,24rem)] space-y-1 overflow-y-auto">
            {filteredGenres.map((genre) => {
              const selected = selectedGenres.includes(genre);
              const disabled = !selected && selectedGenres.length >= maxSelectable;
              const color = colorByGenre.get(genre) ?? getColor(0);
              return (
                <li key={genre}>
                  <label
                    className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3.5 ${
                      selected
                        ? "border-violet-400/65 bg-violet-100 dark:border-violet-400/55 dark:bg-violet-500/15"
                        : "border-card-border bg-card-surface"
                    } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleGenre(genre)}
                      className="h-4 w-4 accent-violet-600"
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {genre}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={patternOpen}
        onClose={() => setPatternOpen(false)}
        ariaLabelledBy={patternTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-8 pt-1" aria-busy={aiRefreshing}>
          <TrendsMobileSheetHeader
            titleId={patternTitleId}
            title={t("mobile.patternSheetTitle")}
            onClose={() => setPatternOpen(false)}
          />
          <div className="mb-4 flex rounded-xl border border-card-border bg-surface p-1" role="tablist" aria-label={t("aiExplanation")}>
            <button
              type="button"
              role="tab"
              aria-selected={summaryVersion === "light"}
              onClick={() => setSummaryVersion("light")}
              className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${
                summaryVersion === "light" ? "bg-card-surface text-foreground shadow-sm" : "text-muted"
              }`}
            >
              {t("summaryVersionLight")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={summaryVersion === "technical"}
              onClick={() => setSummaryVersion("technical")}
              className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold ${
                summaryVersion === "technical" ? "bg-card-surface text-foreground shadow-sm" : "text-muted"
              }`}
            >
              {t("summaryVersionTechnical")}
            </button>
          </div>
          {showAiSkeleton ? (
            <div className="space-y-3 animate-pulse" aria-busy="true">
              <div className="h-4 w-full rounded bg-muted/20" />
              <div className="h-4 w-5/6 rounded bg-muted/20" />
              <div className="h-4 w-2/3 rounded bg-muted/20" />
            </div>
          ) : activeAiError ? (
            isGroqDailyQuotaError(activeAiError) ? (
              <GroqQuotaNotice error={activeAiError} />
            ) : (
              <p className="text-sm text-red-600 dark:text-red-300" role="alert">
                {activeAiError.message}
              </p>
            )
          ) : aiUnavailable ? (
            <AiUnavailableCta reason={aiUnavailableReason ?? "consent"} />
          ) : hasDisplayableAiParagraph ? (
            <p className={`whitespace-pre-line text-sm leading-6 text-foreground ${aiRefreshing ? "opacity-60" : ""}`}>
              {displayAiCommentary}
            </p>
          ) : (
            <p className="text-sm text-muted">{t("aiEmpty")}</p>
          )}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
