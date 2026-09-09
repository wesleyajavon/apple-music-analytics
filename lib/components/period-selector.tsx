"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useId } from "react";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";

export type PeriodType = "day" | "week" | "month";

interface PeriodOption {
  labelKey: "daily" | "weekly" | "monthly";
  value: PeriodType;
}

const periods: PeriodOption[] = [
  { labelKey: "daily", value: "day" },
  { labelKey: "weekly", value: "week" },
  { labelKey: "monthly", value: "month" },
];

export interface PeriodSelectorProps {
  /** When `period` is absent from the URL (e.g. first visit). Defaults to `"day"`. */
  defaultPeriod?: PeriodType;
  /** Page-owned period value, used when the page already normalizes the URL state. */
  value?: PeriodType;
  /** Full-width 44px segments for native mobile trees. Desktop default is unchanged. */
  variant?: "default" | "compact";
  className?: string;
}

export function isPeriodType(value: string | null | undefined): value is PeriodType {
  return value === "day" || value === "week" || value === "month";
}

export function getPeriodFromSearchParams(
  searchParams: { get: (key: string) => string | null },
  defaultPeriod: PeriodType = "day"
): PeriodType {
  const period = searchParams.get("period");
  return isPeriodType(period) ? period : defaultPeriod;
}

/**
 * Group-by (day / week / month). Same Crystal segmented matter as
 * {@link DateRangeFilter} in the dashboard header — not a brand-gradient track.
 */
export function PeriodSelector({
  defaultPeriod = "day",
  value,
  variant = "default",
  className,
}: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();
  const t = useTranslations("components.periodSelector");
  const radiogroupLabelId = useId();

  const currentPeriod = value ?? getPeriodFromSearchParams(searchParams, defaultPeriod);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const updatePeriod = useCallback(
    (period: PeriodType) => {
      const oldPeriod = currentPeriod;
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);

      if (startDate && endDate) {
        prefetchWithOptimisticUpdate(
          startDate,
          endDate,
          oldPeriod,
          startDate,
          endDate,
          period
        ).catch((error) => {
          console.error("Erreur lors du préchargement optimiste:", error);
        });
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, prefetchWithOptimisticUpdate, startDate, endDate, currentPeriod]
  );

  const compact = variant === "compact";
  const compactLabelKey = {
    daily: "compactDaily",
    weekly: "compactWeekly",
    monthly: "compactMonthly",
  } as const;

  return (
    <div className={compact ? "w-full min-w-0" : "min-w-0"}>
      <span id={radiogroupLabelId} className="sr-only">
        {t("label")}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={radiogroupLabelId}
        className={
          className ??
          (compact
            ? `${DASHBOARD_SEGMENTED_TRACK} w-full`
            : `${DASHBOARD_SEGMENTED_TRACK} min-w-0 shrink`)
        }
      >
        {periods.map((period) => {
          const isActive = currentPeriod === period.value;
          return (
            <button
              key={period.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => updatePeriod(period.value)}
              className={
                compact
                  ? `${isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL} flex-1`
                  : isActive
                    ? DASHBOARD_SEGMENTED_PILL_ACTIVE
                    : DASHBOARD_SEGMENTED_PILL
              }
            >
              {t(compact ? compactLabelKey[period.labelKey] : period.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
