"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Music2, Sparkles } from "lucide-react";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { UserAvatar } from "@/lib/components/user-avatar";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";

type BattleHeroProps = {
  mode: "picker" | "battle";
  viewerName: string;
  viewerAvatar?: string | null;
  friendName?: string;
  friendAvatar?: string | null;
  selfTotal?: number;
  friendTotal?: number;
  locale: string;
  friendsReadyCount?: number;
  shareActions?: ReactNode;
  seeMusicHref?: string | null;
};

export function DuetCompareHero({
  mode,
  viewerName,
  viewerAvatar,
  friendName,
  friendAvatar,
  selfTotal = 0,
  friendTotal = 0,
  locale,
  friendsReadyCount,
  shareActions,
  seeMusicHref,
}: BattleHeroProps) {
  const t = useTranslations("duet.compare");
  const { resolvedTheme } = useTheme();
  const chartThemeMode = resolvedTheme === "dark" ? "dark" : "light";
  const selfColor = getCrystalSeriesColor(0, chartThemeMode);
  const friendColor = getCrystalSeriesColor(1, chartThemeMode);

  const total = selfTotal + friendTotal;
  const selfPct = total > 0 ? Math.round((selfTotal / total) * 100) : 50;
  const friendPct = total > 0 ? 100 - selfPct : 50;
  const margin = Math.abs(selfTotal - friendTotal);
  const leader =
    selfTotal > friendTotal ? "self" : friendTotal > selfTotal ? "friend" : "tie";

  const title = mode === "battle" && friendName ? t("heroTitleBattle") : t("heroTitle");
  const description =
    mode === "battle" && friendName
      ? t("heroSubtitleBattle", { friendName })
      : t("heroSubtitle");

  return (
    <OverviewHeroFrame title={title} description={description}>
      {mode === "battle" && friendName ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href="/dashboard/duet/compare" className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline`}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("changeFriend")}
          </Link>
          {seeMusicHref ? (
            <Link href={seeMusicHref} className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline`}>
              <Music2 className="h-3.5 w-3.5" aria-hidden />
              {t("seeMusic")}
            </Link>
          ) : null}
        </div>
      ) : null}

      {mode === "picker" ? (
        <div className="mt-6 space-y-4">
          {friendsReadyCount != null && friendsReadyCount > 0 ? (
            <p className="text-[13px] text-muted">{t("pickerReadyCount", { count: friendsReadyCount })}</p>
          ) : null}
          <p className="max-w-2xl text-[13px] leading-6 text-muted">{t("heroPrivacyNote")}</p>
          <Link
            href="/dashboard/duet/friends"
            className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline text-foreground`}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("goToFriends")}
          </Link>
        </div>
      ) : null}

      {mode === "battle" && friendName ? (
        <div className="mt-6 space-y-5">
          <div className={DASHBOARD_METRIC_STRIP} role="group" aria-label={t("heroStatBadge")}>
            <div className={DASHBOARD_METRIC_CELL}>
              <div className="mb-2 flex items-center gap-2">
                <UserAvatar name={viewerName} src={viewerAvatar} size="sm" />
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: selfColor }}
                  aria-hidden
                />
                <p className="truncate text-[13px] font-medium text-foreground">{viewerName}</p>
              </div>
              <p className={DASHBOARD_METRIC_VALUE}>{selfTotal.toLocaleString(locale)}</p>
              <p className={DASHBOARD_METRIC_LABEL}>
                {leader === "self" ? t("scoreboardLeadsSelf") : t("seriesSelf")}
              </p>
            </div>
            <div className={DASHBOARD_METRIC_CELL}>
              <div className="mb-2 flex items-center gap-2">
                <UserAvatar name={friendName} src={friendAvatar} size="sm" />
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: friendColor }}
                  aria-hidden
                />
                <p className="truncate text-[13px] font-medium text-foreground">{friendName}</p>
              </div>
              <p className={DASHBOARD_METRIC_VALUE}>{friendTotal.toLocaleString(locale)}</p>
              <p className={DASHBOARD_METRIC_LABEL}>
                {leader === "friend"
                  ? t("scoreboardLeadsFriend", { name: friendName })
                  : leader === "tie"
                    ? t("scoreboardTie")
                    : t("seriesFriend", { friendName })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="transition-all duration-700"
                style={{ width: `${selfPct}%`, backgroundColor: selfColor }}
              />
              <div
                className="transition-all duration-700"
                style={{ width: `${friendPct}%`, backgroundColor: friendColor }}
              />
            </div>
            {margin > 0 && leader !== "tie" ? (
              <p className="text-[13px] text-muted">
                {t("scoreboardMargin", { margin: margin.toLocaleString(locale) })}
              </p>
            ) : null}
          </div>

          {shareActions ? <div>{shareActions}</div> : null}
        </div>
      ) : null}
    </OverviewHeroFrame>
  );
}
