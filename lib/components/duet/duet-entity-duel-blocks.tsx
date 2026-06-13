"use client";

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
import { DASHBOARD_CHART_THEME } from "@/lib/constants/dashboard-spotlight";

export type DualLineChartPoint = { date: string; self: number; friend: number };

export function DuetDualLineChart({
  data,
  chartTheme,
  resolvedTheme,
  selfLabel,
  friendLabel,
}: {
  data: DualLineChartPoint[];
  chartTheme: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
  resolvedTheme: string;
  selfLabel: string;
  friendLabel: string;
}) {
  return (
    <ChartResponsiveContainer token="trendsLine">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
        <XAxis dataKey="date" tick={{ fill: chartTheme.tick, fontSize: 12 }} stroke={chartTheme.axisStroke} />
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
}: {
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
}) {
  const total = selfCount + friendCount;
  const selfPct = total > 0 ? (selfCount / total) * 100 : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;
  const canShare = total > 0;

  const winnerLabel =
    winner === "tie"
      ? t("battleTie")
      : winner === "self"
        ? t("battleWinnerSelf")
        : t("battleWinnerFriend", { friendName });

  function buildArenaLabel() {
    return arenaMode === "artist"
      ? t("shareArenaArtist")
      : arenaMode === "track"
        ? t("shareArenaTrack")
        : t("shareArenaGenre");
  }

  async function buildShareImageBlob() {
    return generateDuetBattleSharePng({
      arenaLabel: buildArenaLabel(),
      entityName,
      entitySubtitle,
      entityImageUrl: arenaMode === "artist" ? entityImageUrl : undefined,
      viewerName,
      friendName,
      viewerAvatarUrl,
      friendAvatarUrl,
      selfCount,
      friendCount,
      winner,
      winnerHeadline: winnerLabel,
      selfLabel: t("seriesSelf"),
      friendLabel: t("seriesFriend", { friendName }),
      brandName: t("shareBrandName"),
      brandTagline: t("shareBrandTagline"),
    });
  }

  function buildShareCaption() {
    const outcome =
      winner === "tie"
        ? t("shareOutcomeTie", { friendName })
        : winner === "self"
          ? t("shareOutcomeSelf")
          : t("shareOutcomeFriend", { friendName });
    return t("shareBattleText", {
      arenaLabel: buildArenaLabel(),
      entityName,
      selfCount: selfCount.toLocaleString(locale),
      friendName,
      friendCount: friendCount.toLocaleString(locale),
      outcome,
    });
  }

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
            animate={winner !== "tie" ? { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-600 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
          >
            {winner === "tie" ? <Swords className="h-5 w-5" aria-hidden /> : <Trophy className="h-5 w-5" aria-hidden />}
          </motion.div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {entityName}
            </p>
            {entitySubtitle ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entitySubtitle}</p>
            ) : null}
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{winnerLabel}</p>
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
            <DuetShareCardActions
              canShare={canShare}
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
