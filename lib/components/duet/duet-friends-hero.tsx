"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Swords, UserPlus } from "lucide-react";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";

type DuetFriendsHeroProps = {
  friendsCount: number;
  pendingIncomingCount: number;
  pendingOutgoingCount: number;
  locale: string;
};

export function DuetFriendsHero({
  friendsCount,
  pendingIncomingCount,
  pendingOutgoingCount,
  locale,
}: DuetFriendsHeroProps) {
  const t = useTranslations("duet.friends");

  return (
    <OverviewHeroFrame title={t("heroTitle")} description={t("heroSubtitle")}>
      <div className={`mt-6 ${DASHBOARD_METRIC_STRIP}`} role="group" aria-label={t("heroStatBadge")}>
        <div className={DASHBOARD_METRIC_CELL}>
          <p className={DASHBOARD_METRIC_VALUE}>{friendsCount.toLocaleString(locale)}</p>
          <p className={DASHBOARD_METRIC_LABEL}>{t("heroFriendsCount")}</p>
        </div>
        <div className={DASHBOARD_METRIC_CELL}>
          <p className={DASHBOARD_METRIC_VALUE}>{pendingIncomingCount.toLocaleString(locale)}</p>
          <p className={DASHBOARD_METRIC_LABEL}>{t("heroPendingIncoming")}</p>
        </div>
        <div className={DASHBOARD_METRIC_CELL}>
          <p className={DASHBOARD_METRIC_VALUE}>{pendingOutgoingCount.toLocaleString(locale)}</p>
          <p className={DASHBOARD_METRIC_LABEL}>{t("heroPendingOutgoing")}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {friendsCount > 0 ? (
          <Link
            href="/dashboard/duet/compare"
            className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline text-foreground`}
          >
            <Swords className="h-4 w-4" aria-hidden />
            {t("ctaCompare")}
          </Link>
        ) : null}
        <Link
          href="/dashboard/duet/friends?section=invite"
          className={`${DASHBOARD_BTN_GHOST} gap-2 no-underline`}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {t("heroStatTag")}
        </Link>
      </div>

      <ul className="mt-5 max-w-2xl space-y-1.5 text-[13px] leading-5 text-muted">
        <li>{t("heroTrust1")}</li>
        <li>{t("heroTrust2")}</li>
        <li>{t("heroTrust3")}</li>
      </ul>
    </OverviewHeroFrame>
  );
}
