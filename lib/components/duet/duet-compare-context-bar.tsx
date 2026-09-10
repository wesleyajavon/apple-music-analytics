"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeftRight, CalendarDays, Music2 } from "lucide-react";
import { UserAvatar } from "@/lib/components/user-avatar";
import { PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { DuetChartViewToggle } from "@/lib/components/duet/duet-chart-view-toggle";
import type { DuetChartViewMode } from "@/lib/components/duet/duet-entity-duel-blocks";
import { DASHBOARD_BTN_GHOST } from "@/lib/components/dashboard-ui";

const DUET_COMPARE_CONTEXT_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 border-b border-glass-hairline bg-surface/85 px-4 py-3 backdrop-blur-md dark:bg-surface/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";

const CONTEXT_LINK_CLASS = `${DASHBOARD_BTN_GHOST} min-h-11 gap-1.5 px-3 text-[13px] no-underline`;

type DuetCompareContextBarProps = {
  id?: string;
  viewerName: string;
  viewerAvatar?: string | null;
  friendName: string;
  friendAvatar?: string | null;
  dateRangeLabel: string;
  period: PeriodType;
  chartView: DuetChartViewMode;
  onChartViewChange: (mode: DuetChartViewMode) => void;
  seeMusicHref?: string | null;
};

export function DuetCompareContextBar({
  id,
  viewerName,
  viewerAvatar,
  friendName,
  friendAvatar,
  dateRangeLabel,
  period,
  chartView,
  onChartViewChange,
  seeMusicHref,
}: DuetCompareContextBarProps) {
  const t = useTranslations("duet.compare");
  const tOverview = useTranslations("overview");

  const periodBadge = dateRangeLabel || tOverview("allData");

  return (
    <div id={id} className={DUET_COMPARE_CONTEXT_BAR_CLASS}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={viewerName} src={viewerAvatar} size="sm" />
            <span className="max-w-[5.5rem] truncate text-[13px] font-semibold text-foreground">
              {viewerName}
            </span>
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-muted"
            aria-hidden
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            VS
          </span>

          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={friendName} src={friendAvatar} size="sm" />
            <span className="max-w-[5.5rem] truncate text-[13px] font-semibold text-foreground">
              {friendName}
            </span>
          </div>

          <Link href="/dashboard/duet/compare" className={`ml-auto lg:ml-0 ${CONTEXT_LINK_CLASS}`}>
            {t("changeFriend")}
          </Link>
          {seeMusicHref ? (
            <Link href={seeMusicHref} className={CONTEXT_LINK_CLASS}>
              <Music2 className="h-3.5 w-3.5" aria-hidden />
              {t("seeMusic")}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex min-w-0 flex-col gap-0.5 sm:items-end">
            <span className="text-[13px] font-medium text-muted">{t("contextBarPeriodLabel")}</span>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
              {periodBadge}
            </span>
            <span className="text-[13px] leading-snug text-muted">{t("contextBarPeriodHint")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PeriodSelector value={period} defaultPeriod="month" />
            <DuetChartViewToggle value={chartView} onChange={onChartViewChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
