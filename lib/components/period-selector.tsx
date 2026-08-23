"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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

export function PeriodSelector({
  defaultPeriod = "day",
  value,
  variant = "default",
}: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();
  const t = useTranslations("components.periodSelector");

  const currentPeriod = value ?? getPeriodFromSearchParams(searchParams, defaultPeriod);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const buttonRefs = useRef<Record<PeriodType, HTMLButtonElement | null>>({
    day: null,
    week: null,
    month: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeButton = buttonRefs.current[currentPeriod];
    if (activeButton && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [currentPeriod]);

  useEffect(() => {
    const handleResize = () => {
      const activeButton = buttonRefs.current[currentPeriod];
      if (activeButton && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPeriod]);

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
    <div className={compact ? "w-full" : "flex items-center gap-4"}>
      <span
        className={
          compact
            ? "sr-only"
            : "shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted"
        }
      >
        {t("label")}
      </span>
      <div
        ref={containerRef}
        className={
          compact
            ? "relative flex w-full items-center rounded-2xl border border-card-border bg-surface p-1"
            : "relative flex items-center rounded-xl border border-card-border bg-surface p-1.5"
        }
      >
        {indicatorStyle && (
          <div
            className={
              compact
                ? "absolute top-1 h-[calc(100%-8px)] rounded-xl bg-brand-gradient shadow-sm transition-all duration-300 ease-out"
                : "absolute top-1.5 h-[calc(100%-12px)] rounded-lg bg-brand-gradient shadow-sm transition-all duration-300 ease-out"
            }
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}
        {periods.map((period) => {
          const isActive = currentPeriod === period.value;
          return (
            <button
              key={period.value}
              type="button"
              ref={(el) => {
                buttonRefs.current[period.value] = el;
              }}
              onClick={() => updatePeriod(period.value)}
              className={
                compact
                  ? `relative z-10 min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold transition-all duration-200 ${
                      isActive ? "text-white" : "text-muted hover:text-foreground"
                    }`
                  : `relative z-10 rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                      isActive ? "text-white" : "text-muted hover:text-foreground"
                    }`
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
