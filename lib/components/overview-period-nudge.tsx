"use client";

import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { focusDashboardDateRangeFilter } from "@/lib/utils/focus-dashboard-date-range-filter";

type OverviewPeriodBadgeButtonProps = {
  badgeLabel: string;
  compact?: boolean;
};

export function OverviewPeriodBadgeButton({
  badgeLabel,
  compact = false,
}: OverviewPeriodBadgeButtonProps) {
  const t = useTranslations("overview.periodNudge");

  return (
    <button
      type="button"
      onClick={focusDashboardDateRangeFilter}
      title={t("badgeTitle")}
      aria-label={t("badgeAria", { label: badgeLabel })}
      className={
        compact
          ? "inline-flex min-h-8 max-w-[min(100%,13.5rem)] shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold text-white/85 transition hover:border-white/30 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          : "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/30 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      }
    >
      <CalendarDays className={compact ? "h-3.5 w-3.5 shrink-0 opacity-80" : "h-3.5 w-3.5 shrink-0"} aria-hidden />
      <span className="min-w-0 truncate">{badgeLabel}</span>
      {compact ? null : (
        <span className="normal-case tracking-normal text-white/45">{t("adjust")}</span>
      )}
    </button>
  );
}

export function OverviewPeriodHint({
  compact = false,
}: {
  compact?: boolean;
}) {
  const t = useTranslations("overview.periodNudge");

  return (
    <button
      type="button"
      onClick={focusDashboardDateRangeFilter}
      className={
        compact
          ? "mt-3 block rounded-lg text-left text-xs leading-5 text-slate-400 transition hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          : "mt-4 block max-w-2xl rounded-lg text-left text-sm leading-6 text-white/45 transition hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      }
    >
      {t("hint")}
    </button>
  );
}
