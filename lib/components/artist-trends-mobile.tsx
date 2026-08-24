"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArtistTrendsArtistPicker } from "@/lib/components/artist-trends-artist-picker";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { GroqQuotaNotice } from "@/lib/components/error-state";
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
import type { ArtistTrendsChartArtist, ArtistTrendsChartDataPoint } from "@/lib/dto/artist";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import type { ListenTrendChartViewMode } from "@/lib/utils/listen-trend-chart-view";

const VISIBLE_SERIES = 5;

type ArtistTrendSignal = {
  id: string;
  label: string;
  color: string;
  total: number;
  delta: number;
  peak: number;
  peakDate: string;
};

function buildArtistTrendSignals({
  chartData,
  selectedIds,
  idToName,
  getArtistIndex,
  getColor,
}: {
  chartData: ArtistTrendsChartDataPoint[];
  selectedIds: string[];
  idToName: Map<string, string>;
  getArtistIndex: (artistId: string) => number;
  getColor: (index: number) => string;
}): ArtistTrendSignal[] {
  return selectedIds
    .map((artistId) => {
      let total = 0;
      let peak = 0;
      let peakDate = "";
      chartData.forEach((point) => {
        const value = numericTrendValue(point, artistId);
        total += value;
        if (value > peak) {
          peak = value;
          peakDate = String(point.formattedDate || point.date || "");
        }
      });
      const first = chartData[0] ? numericTrendValue(chartData[0], artistId) : 0;
      const last = chartData[chartData.length - 1]
        ? numericTrendValue(chartData[chartData.length - 1], artistId)
        : 0;
      const idx = getArtistIndex(artistId);
      return {
        id: artistId,
        label: idToName.get(artistId) ?? artistId,
        color: getColor(idx >= 0 ? idx : 0),
        total,
        delta: last - first,
        peak,
        peakDate,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function ArtistTrendsMobileEmpty({
  artistsHref,
}: {
  artistsHref: string;
}) {
  const locale = useLocale();
  const t = useTranslations("artistTrends");

  return (
    <TrendsMobileEmpty
      locale={locale}
      eyebrow={t("mobile.eyebrow")}
      title={t("mobile.emptyTitle")}
      lead={t("mobile.emptyLead")}
      leaderboardHref={artistsHref}
      leaderboardTitle={t("backToArtists")}
      leaderboardLead={t("mobile.leaderboardLead")}
    />
  );
}

export function ArtistTrendsMobileError({
  error,
  onRetry,
}: {
  error?: Error | null;
  onRetry: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("artistTrends");

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

export { TrendsMobileSkeleton as ArtistTrendsMobileSkeleton };

export function ArtistTrendsMobileExperience({
  artistsHref,
  period,
  selectedIds,
  pickerArtists,
  chartData,
  chartDisplayData,
  isLoading,
  isUpdating,
  idToName,
  getArtistIndex,
  getColor,
  toggleArtist,
  selectAll,
  selectNone,
  handlePickRemoteArtist,
  maxSelectable,
  chartView,
  setChartView,
  aiVisible,
  summaryVersion,
  setSummaryVersion,
  showAiSkeleton,
  activeAiError,
  aiUnavailable,
  hasDisplayableAiParagraph,
  displayAiCommentary,
  aiRefreshing,
  commentaryCached,
}: {
  artistsHref: string;
  period: PeriodType;
  selectedIds: string[];
  pickerArtists: ArtistTrendsChartArtist[];
  chartData: ArtistTrendsChartDataPoint[];
  chartDisplayData: ArtistTrendsChartDataPoint[];
  isLoading: boolean;
  isUpdating: boolean;
  idToName: Map<string, string>;
  getArtistIndex: (artistId: string) => number;
  getColor: (index: number) => string;
  toggleArtist: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  handlePickRemoteArtist: (artist: ArtistTrendsChartArtist) => void;
  maxSelectable: number;
  chartView: ListenTrendChartViewMode;
  setChartView: (mode: ListenTrendChartViewMode) => void;
  aiVisible: boolean;
  summaryVersion: "light" | "technical";
  setSummaryVersion: (version: "light" | "technical") => void;
  showAiSkeleton: boolean;
  activeAiError: Error | null;
  aiUnavailable: boolean;
  hasDisplayableAiParagraph: boolean;
  displayAiCommentary: string;
  aiRefreshing: boolean;
  commentaryCached: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("artistTrends");
  const tPeriod = useTranslations("components.periodSelector");
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);
  const compareTitleId = useId();
  const patternTitleId = useId();

  const signals = useMemo(
    () => buildArtistTrendSignals({ chartData, selectedIds, idToName, getArtistIndex, getColor }),
    [chartData, getArtistIndex, getColor, idToName, selectedIds],
  );
  const visibleSignals = signals.slice(0, VISIBLE_SERIES);
  const leadSignal = signals[0];
  const movementSignal = signals.reduce<ArtistTrendSignal | undefined>((best, signal) => {
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
            value={String(selectedIds.length)}
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
          href={artistsHref}
          title={t("backToArtists")}
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
          <ArtistTrendsArtistPicker
            catalogArtists={pickerArtists}
            selectedIds={selectedIds}
            onToggle={toggleArtist}
            getColor={getColor}
            getArtistIndex={getArtistIndex}
            enableRemoteSearch
            onPickRemoteArtist={handlePickRemoteArtist}
            maxSelectable={maxSelectable}
            idPrefix="mobile-artist-trends"
            compact
          />
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
          {commentaryCached ? (
            <p className="mb-3 text-xs text-muted">{t("aiCached")}</p>
          ) : null}
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
            <p className="text-sm text-muted">{t("aiUnavailable")}</p>
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
