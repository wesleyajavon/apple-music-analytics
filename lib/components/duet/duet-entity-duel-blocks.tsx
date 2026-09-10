"use client";

import { useMemo } from "react";
import { Crown, Swords, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { DuetShareCardActions } from "@/lib/components/duet/duet-share-card-actions";
import type { DuetArenaMode } from "@/lib/components/duet/duet-battle-arena-ui";
import { generateDuetBattleSharePng } from "@/lib/utils/duet-battle-share-image";
import { duetShareHeadlineKey, duetShareLeadKey } from "@/lib/utils/duet-share-headline";
import type { PeriodType } from "@/lib/components/period-selector";
import {
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";
import type { DualLineChartPoint } from "@/lib/utils/listen-trend-chart-view";
import { formatTrendDate } from "@/lib/utils/genre-trends-pivot";

export type { DualLineChartPoint, ListenTrendChartViewMode as DuetChartViewMode } from "@/lib/utils/listen-trend-chart-view";

export {
  applyListenTrendChartViewDual as applyDuetChartView,
  toCumulativeDualLineChartData,
} from "@/lib/utils/listen-trend-chart-view";

type DuetDualLineChartRow = DualLineChartPoint & { formattedDate: string };

function formatDuetChartDate(date: string, period: PeriodType, locale: string): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  if (period === "day") {
    return new Date(date).toLocaleDateString(locale, dateOptions);
  }

  if (period === "week") {
    const weekStart = new Date(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = weekStart.toLocaleDateString(locale, dateOptions);
    const endStr = weekEnd.toLocaleDateString(locale, dateOptions);
    return `${startStr} - ${endStr}`;
  }

  return formatTrendDate(date, period, locale);
}

export function DuetDualLineChart({
  data,
  period,
  locale,
  selfLabel,
  friendLabel,
  chartTheme: _chartTheme,
  resolvedTheme: _resolvedTheme,
}: {
  data: DualLineChartPoint[];
  period: PeriodType;
  locale: string;
  selfLabel: string;
  friendLabel: string;
  /** @deprecated Crystal chart ignores legacy theme tokens. */
  chartTheme?: unknown;
  /** @deprecated Crystal chart uses ThemeProvider. */
  resolvedTheme?: string;
}) {
  const { resolvedTheme } = useTheme();
  const chartThemeName = resolvedTheme === "dark" ? "dark" : "light";

  const chartData = useMemo<DuetDualLineChartRow[]>(
    () =>
      data.map((row) => ({
        ...row,
        formattedDate: formatDuetChartDate(row.date, period, locale),
      })),
    [data, period, locale]
  );

  const series = useMemo(
    () => [
      {
        dataKey: "self",
        name: selfLabel,
        color: getCrystalSeriesColor(0, chartThemeName),
      },
      {
        dataKey: "friend",
        name: friendLabel,
        color: getCrystalSeriesColor(1, chartThemeName),
      },
    ],
    [chartThemeName, friendLabel, selfLabel]
  );

  const formatValue = useMemo(
    () => (value: number) =>
      new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value),
    [locale]
  );

  return (
    <OverviewTrendsChart data={chartData} series={series} formatValue={formatValue} />
  );
}

type EntityBattleShareActionsProps = {
  selfCount: number;
  friendCount: number;
  viewerName: string;
  friendName: string;
  viewerAvatarUrl?: string | null;
  friendAvatarUrl?: string | null;
  winner: "self" | "friend" | "tie";
  entityName: string;
  entitySubtitle?: string;
  entityImageUrl?: string | null;
  arenaMode: DuetArenaMode;
  locale: string;
  t: ReturnType<typeof useTranslations<"duet.compare">>;
  variant?: "scorecard" | "mobile";
};

export function EntityBattleShareActions({
  selfCount,
  friendCount,
  viewerName,
  friendName,
  viewerAvatarUrl,
  friendAvatarUrl,
  winner,
  entityName,
  entitySubtitle,
  entityImageUrl,
  arenaMode,
  locale,
  t,
  variant = "scorecard",
}: EntityBattleShareActionsProps) {
  const canShare = selfCount + friendCount > 0;
  const winnerLabel = t(duetShareHeadlineKey(arenaMode, winner), {
    friendName,
    entityName,
  });

  function buildArenaLabel() {
    return arenaMode === "artist" ? t("shareArenaArtist") : t("shareArenaTrack");
  }

  async function buildShareImageBlob() {
    const margin = Math.abs(selfCount - friendCount);
    return generateDuetBattleSharePng({
      arenaLabel: buildArenaLabel(),
      entityName,
      entitySubtitle: entitySubtitle || t("shareVersusSubtitle", { friendName }),
      entityImageUrl: arenaMode === "artist" ? entityImageUrl : undefined,
      viewerName,
      friendName,
      viewerAvatarUrl,
      friendAvatarUrl,
      selfCount,
      friendCount,
      winner,
      winnerHeadline: winnerLabel,
      selfLabel: t("shareCountLabel"),
      friendLabel: t("shareCountLabel"),
      brandName: t("shareBrandName"),
      brandTagline: t("shareBrandTagline"),
      vsLabel: t("shareVsLabel"),
      leadLabel:
        winner === "friend"
          ? t("scoreboardLeadsFriend", { name: friendName })
          : t(duetShareLeadKey(winner)),
      marginCaption:
        winner === "tie" || margin === 0
          ? undefined
          : t("scoreboardMargin", { margin: margin.toLocaleString(locale) }),
    });
  }

  function buildShareCaption() {
    return t("shareBattleText", {
      arenaLabel: buildArenaLabel(),
      entityName,
      selfCount: selfCount.toLocaleString(locale),
      friendName,
      friendCount: friendCount.toLocaleString(locale),
      outcome: winnerLabel,
    });
  }

  return (
    <DuetShareCardActions
      canShare={canShare}
      variant={variant}
      buildImageBlob={buildShareImageBlob}
      buildCaption={buildShareCaption}
      shareLabel={t("shareBattleImage")}
      downloadLabel={t("downloadBattleImage")}
      preparingLabel={t("shareImagePreparing")}
      sharedImageLabel={t("shareImageShared")}
      sharedTextLabel={t("shareShared")}
      copiedLabel={t("shareCopied")}
      savedLabel={t("shareImageSaved")}
      downloadFilename="soundprint-duel.png"
    />
  );
}

export function EntityBattleScorecard({
  selfCount,
  friendCount,
  viewerName,
  friendName,
  viewerAvatarUrl,
  friendAvatarUrl,
  winner,
  entityName,
  entitySubtitle,
  entityImageUrl,
  arenaMode,
  locale,
  t,
}: Omit<EntityBattleShareActionsProps, "variant">) {
  const { resolvedTheme } = useTheme();
  const chartThemeName = resolvedTheme === "dark" ? "dark" : "light";
  const selfColor = getCrystalSeriesColor(0, chartThemeName);
  const friendColor = getCrystalSeriesColor(1, chartThemeName);

  const total = selfCount + friendCount;
  const selfPct = total > 0 ? (selfCount / total) * 100 : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;
  const canShare = total > 0;
  const artistPhotoUrl = arenaMode === "artist" ? entityImageUrl?.trim() || null : null;

  const winnerLabel = t(duetShareHeadlineKey(arenaMode, winner), {
    friendName,
    entityName,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={
              artistPhotoUrl
                ? "h-12 w-12 shrink-0 overflow-hidden rounded-xl"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-muted"
            }
          >
            {artistPhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={artistPhotoUrl}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : winner === "tie" ? (
              <Swords className="h-5 w-5" aria-hidden />
            ) : (
              <Trophy className="h-5 w-5" aria-hidden />
            )}
          </div>
          <div>
            <p className={DASHBOARD_SECTION_EYEBROW}>{entityName}</p>
            {entitySubtitle ? (
              <p className="mt-0.5 text-[13px] text-muted">{entitySubtitle}</p>
            ) : null}
            <p className="mt-1 text-lg font-semibold leading-snug tracking-tight text-foreground">
              {winnerLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {winner !== "tie" ? (
            <span className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted">
              <Crown className="h-3.5 w-3.5" aria-hidden />
              {winner === "self" ? t("seriesSelf") : friendName}
            </span>
          ) : null}
          {canShare ? (
            <EntityBattleShareActions
              selfCount={selfCount}
              friendCount={friendCount}
              viewerName={viewerName}
              friendName={friendName}
              viewerAvatarUrl={viewerAvatarUrl}
              friendAvatarUrl={friendAvatarUrl}
              winner={winner}
              entityName={entityName}
              entitySubtitle={entitySubtitle}
              entityImageUrl={entityImageUrl}
              arenaMode={arenaMode}
              locale={locale}
              t={t}
            />
          ) : null}
        </div>
      </div>

      <div className={DASHBOARD_METRIC_STRIP}>
        <div className={DASHBOARD_METRIC_CELL}>
          <p className={DASHBOARD_METRIC_LABEL}>{t("seriesSelf")}</p>
          <p className={DASHBOARD_METRIC_VALUE}>{selfCount.toLocaleString(locale)}</p>
        </div>
        <div className={DASHBOARD_METRIC_CELL}>
          <p className={DASHBOARD_METRIC_LABEL}>{t("seriesFriend", { friendName })}</p>
          <p className={DASHBOARD_METRIC_VALUE}>{friendCount.toLocaleString(locale)}</p>
        </div>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-surface-raised">
        <div
          className="transition-all duration-500"
          style={{ width: `${selfPct}%`, backgroundColor: selfColor }}
        />
        <div
          className="transition-all duration-500"
          style={{ width: `${friendPct}%`, backgroundColor: friendColor }}
        />
      </div>
    </div>
  );
}
