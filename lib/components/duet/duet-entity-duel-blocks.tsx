"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Crown, Swords, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { DuetShareCardActions } from "@/lib/components/duet/duet-share-card-actions";
import type { DuetArenaMode } from "@/lib/components/duet/duet-battle-arena-ui";
import { generateDuetBattleSharePng } from "@/lib/utils/duet-battle-share-image";
import { duetShareHeadlineKey, duetShareLeadKey } from "@/lib/utils/duet-share-headline";
import type { PeriodType } from "@/lib/components/period-selector";
import { DASHBOARD_CHART_THEME } from "@/lib/constants/dashboard-spotlight";
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
  chartTheme,
  resolvedTheme,
  selfLabel,
  friendLabel,
}: {
  data: DualLineChartPoint[];
  period: PeriodType;
  locale: string;
  chartTheme: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
  resolvedTheme: string;
  selfLabel: string;
  friendLabel: string;
}) {
  const chartData = useMemo<DuetDualLineChartRow[]>(
    () =>
      data.map((row) => ({
        ...row,
        formattedDate: formatDuetChartDate(row.date, period, locale),
      })),
    [data, period, locale]
  );

  return (
    <ChartResponsiveContainer token="trendsLine">
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis
          dataKey="formattedDate"
          tick={{ fill: chartTheme.tick, fontSize: 12 }}
          stroke={chartTheme.axisStroke}
        />
        <YAxis tick={{ fill: chartTheme.tick, fontSize: 12 }} stroke={chartTheme.axisStroke} />
        <Tooltip
          contentStyle={{
            backgroundColor: resolvedTheme === "dark" ? "#0f172a" : "#fff",
            border: `1px solid ${chartTheme.grid}`,
            borderRadius: 12,
          }}
        />
        <Legend wrapperStyle={{ color: chartTheme.legend }} />
        <Line type="monotone" dataKey="self" name={selfLabel} stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="friend" name={friendLabel} stroke="#22d3ee" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ChartResponsiveContainer>
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
      badgeLabel: t("heroEyebrow"),
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
    <motion.div
      key={`${winner}-${selfCount}-${friendCount}`}
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/60 p-5 shadow-inner dark:border-white/10 dark:from-violet-950/40 dark:via-slate-950/60 dark:to-cyan-950/30"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl dark:bg-violet-400/20" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl dark:bg-cyan-400/15" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={winner !== "tie" && !artistPhotoUrl ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 0.55, delay: 0.15 }}
            className={
              artistPhotoUrl
                ? "h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm dark:border-white/15"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
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
          </motion.div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {entityName}
            </p>
            {entitySubtitle ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entitySubtitle}</p>
            ) : null}
            <p className="mt-1 text-lg font-bold leading-snug text-slate-900 dark:text-white">{winnerLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {winner !== "tie" ? (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200/90 bg-amber-50/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
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

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-violet-200/70 bg-white/80 p-3 dark:border-violet-400/20 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-200">
            {t("seriesSelf")}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {selfCount.toLocaleString(locale)}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-200/70 bg-white/80 p-3 dark:border-cyan-400/20 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
            {t("seriesFriend", { friendName })}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {friendCount.toLocaleString(locale)}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex h-4 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
        <div
          className="bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
          style={{ width: `${selfPct}%` }}
        />
        <div
          className="bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all duration-700"
          style={{ width: `${friendPct}%` }}
        />
      </div>
    </motion.div>
  );
}
