"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { TrackTrendsTrackPicker } from "@/lib/components/track-trends-track-picker";
import {
  TRENDS_MOBILE_BLEED,
  TRENDS_MOBILE_SNAP,
  TrendsMobileActionRow,
  TrendsMobileDestinationRow,
  TrendsMobileEmpty,
  TrendsMobileHero,
  TrendsMobileLegendRow,
  TrendsMobileSheetHeader,
  TrendsMobileSignalTile,
  TrendsMobileSkeleton,
} from "@/lib/components/trends-mobile-hub";
import { numericTrendValue, TrendsMobileSpark } from "@/lib/components/trends-mobile-spark";
import type { TrackTrendsChartDataPoint, TrackTrendsChartTrack } from "@/lib/dto/track";
import type { ListenTrendChartViewMode } from "@/lib/utils/listen-trend-chart-view";
import { getTrackLabel } from "@/lib/utils/track-trends-pivot";

const VISIBLE_SERIES = 5;

type TrackTrendSignal = {
  id: string;
  label: string;
  color: string;
  total: number;
  delta: number;
  peak: number;
  peakDate: string;
};

function buildTrackTrendSignals({
  chartData,
  selectedIds,
  idToTrack,
  getTrackIndex,
  getColor,
}: {
  chartData: TrackTrendsChartDataPoint[];
  selectedIds: string[];
  idToTrack: Map<string, TrackTrendsChartTrack>;
  getTrackIndex: (trackId: string) => number;
  getColor: (index: number) => string;
}): TrackTrendSignal[] {
  return selectedIds
    .map((trackId) => {
      let total = 0;
      let peak = 0;
      let peakDate = "";
      chartData.forEach((point) => {
        const value = numericTrendValue(point, trackId);
        total += value;
        if (value > peak) {
          peak = value;
          peakDate = String(point.formattedDate || point.date || "");
        }
      });
      const first = chartData[0] ? numericTrendValue(chartData[0], trackId) : 0;
      const last = chartData[chartData.length - 1]
        ? numericTrendValue(chartData[chartData.length - 1], trackId)
        : 0;
      const track = idToTrack.get(trackId);
      const idx = getTrackIndex(trackId);
      return {
        id: trackId,
        label: track ? getTrackLabel(track) : trackId,
        color: getColor(idx >= 0 ? idx : 0),
        total,
        delta: last - first,
        peak,
        peakDate,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function TrackTrendsMobileEmpty({
  tracksHref,
  children,
}: {
  tracksHref: string;
  children?: ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("trackTrends");

  return (
    <TrendsMobileEmpty
      locale={locale}
      eyebrow={t("mobile.eyebrow")}
      title={t("mobile.emptyTitle")}
      lead={t("mobile.emptyLead")}
      leaderboardHref={tracksHref}
      leaderboardTitle={t("mobile.leaderboardTitle")}
      leaderboardLead={t("mobile.leaderboardLead")}
    >
      {children}
    </TrendsMobileEmpty>
  );
}

export { TrendsMobileSkeleton as TrackTrendsMobileSkeleton };

export function TrackTrendsMobileExperience({
  tracksHref,
  period,
  selectedIds,
  pickerTracks,
  chartData,
  chartDisplayData,
  isLoading,
  isUpdating,
  idToTrack,
  getTrackIndex,
  getColor,
  toggleTrack,
  selectAll,
  selectNone,
  handlePickRemoteTrack,
  maxSelectable,
  chartView,
  setChartView,
}: {
  tracksHref: string;
  period: PeriodType;
  selectedIds: string[];
  pickerTracks: TrackTrendsChartTrack[];
  chartData: TrackTrendsChartDataPoint[];
  chartDisplayData: TrackTrendsChartDataPoint[];
  isLoading: boolean;
  isUpdating: boolean;
  idToTrack: Map<string, TrackTrendsChartTrack>;
  getTrackIndex: (trackId: string) => number;
  getColor: (index: number) => string;
  toggleTrack: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  handlePickRemoteTrack: (track: TrackTrendsChartTrack) => void;
  maxSelectable: number;
  chartView: ListenTrendChartViewMode;
  setChartView: (mode: ListenTrendChartViewMode) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("trackTrends");
  const tPeriod = useTranslations("components.periodSelector");
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [compareOpen, setCompareOpen] = useState(false);
  const compareTitleId = useId();

  const signals = useMemo(
    () =>
      buildTrackTrendSignals({
        chartData,
        selectedIds,
        idToTrack,
        getTrackIndex,
        getColor,
      }),
    [chartData, getColor, getTrackIndex, idToTrack, selectedIds],
  );
  const visibleSignals = signals.slice(0, VISIBLE_SERIES);
  const leadSignal = signals[0];
  const movementSignal = signals.reduce<TrackTrendSignal | undefined>((best, signal) => {
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
          href={tracksHref}
          title={t("mobile.leaderboardTitle")}
          lead={t("mobile.leaderboardLead")}
        />
        <TrendsMobileActionRow
          title={t("mobile.compareTitle")}
          lead={t("mobile.compareLead")}
          onClick={() => setCompareOpen(true)}
        />
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
              className="min-h-11 flex-1 rounded-2xl border border-cyan-200/80 bg-white px-4 text-sm font-semibold text-cyan-950 shadow-sm dark:border-cyan-400/35 dark:bg-cyan-500/15 dark:text-cyan-100"
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
          <TrackTrendsTrackPicker
            catalogTracks={pickerTracks}
            selectedIds={selectedIds}
            onToggle={toggleTrack}
            getColor={getColor}
            getTrackIndex={getTrackIndex}
            enableRemoteSearch
            onPickRemoteTrack={handlePickRemoteTrack}
            maxSelectable={maxSelectable}
            idPrefix="mobile-track-trends"
            compact
          />
        </div>
      </MobileBottomSheet>
    </div>
  );
}
