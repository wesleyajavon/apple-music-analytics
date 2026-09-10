"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Music2 } from "lucide-react";
import { DASHBOARD_BTN_GHOST } from "@/lib/components/dashboard-ui";

const DUET_COMPARE_CONTEXT_BAR_CLASS =
  "sticky top-[var(--dashboard-filter-height)] z-20 -mx-4 border-b border-glass-hairline bg-surface/85 px-4 py-2.5 backdrop-blur-md dark:bg-surface/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";

const CONTEXT_LINK_CLASS = `${DASHBOARD_BTN_GHOST} min-h-11 gap-1.5 px-3 text-[13px] no-underline`;

type DuetCompareContextBarProps = {
  id?: string;
  dateRangeLabel: string;
  seeMusicHref?: string | null;
};

export function DuetCompareContextBar({
  id,
  dateRangeLabel,
  seeMusicHref,
}: DuetCompareContextBarProps) {
  const t = useTranslations("duet.compare");
  const tOverview = useTranslations("overview");

  const periodBadge = dateRangeLabel || tOverview("allData");

  return (
    <div id={id} className={DUET_COMPARE_CONTEXT_BAR_CLASS}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/duet/compare" className={CONTEXT_LINK_CLASS}>
          {t("changeFriend")}
        </Link>
        {seeMusicHref ? (
          <Link href={seeMusicHref} className={CONTEXT_LINK_CLASS}>
            <Music2 className="h-3.5 w-3.5" aria-hidden />
            {t("seeMusic")}
          </Link>
        ) : null}
        <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate font-medium text-foreground">{periodBadge}</span>
        </span>
      </div>
    </div>
  );
}
