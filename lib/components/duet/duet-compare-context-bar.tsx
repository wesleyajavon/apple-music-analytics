"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeftRight, CalendarDays, Music2 } from "lucide-react";
import { UserAvatar } from "@/lib/components/user-avatar";
import { PeriodSelector, type PeriodType } from "@/lib/components/period-selector";
import { DuetChartViewToggle } from "@/lib/components/duet/duet-chart-view-toggle";
import type { DuetChartViewMode } from "@/lib/components/duet/duet-entity-duel-blocks";

const DUET_COMPARE_CONTEXT_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";

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
            <span className="max-w-[5.5rem] truncate text-sm font-semibold text-slate-900 dark:text-white">
              {viewerName}
            </span>
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200/80 bg-violet-50 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-widest text-violet-700 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200"
            aria-hidden
          >
            <ArrowLeftRight className="h-3 w-3" />
            VS
          </span>

          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={friendName} src={friendAvatar} size="sm" />
            <span className="max-w-[5.5rem] truncate text-sm font-semibold text-slate-900 dark:text-white">
              {friendName}
            </span>
          </div>

          <Link
            href="/dashboard/duet/compare"
            className="ml-auto inline-flex min-h-8 items-center rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-400/30 dark:hover:text-violet-200 lg:ml-0"
          >
            {t("changeFriend")}
          </Link>
          {seeMusicHref ? (
            <Link
              href={seeMusicHref}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-600 no-underline transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-400/30 dark:hover:text-violet-200"
            >
              <Music2 className="h-3.5 w-3.5" aria-hidden />
              {t("seeMusic")}
            </Link>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="flex min-w-0 flex-col gap-0.5 sm:items-end">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("contextBarPeriodLabel")}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-300" aria-hidden />
              {periodBadge}
            </span>
            <span className="text-[0.65rem] leading-snug text-slate-500 dark:text-slate-400">
              {t("contextBarPeriodHint")}
            </span>
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
