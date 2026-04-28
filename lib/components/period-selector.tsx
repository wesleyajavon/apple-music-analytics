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

export function PeriodSelector({ defaultPeriod = "day", value }: PeriodSelectorProps) {
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

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, prefetchWithOptimisticUpdate, startDate, endDate, currentPeriod]
  );

  return (
    <div className="flex items-center gap-4">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted shrink-0">
        {t("label")}
      </span>
      <div
        ref={containerRef}
        className="relative flex items-center bg-surface p-1.5 rounded-xl border border-card-border"
      >
        {indicatorStyle && (
          <div
            className="absolute h-[calc(100%-12px)] top-1.5 bg-brand-gradient rounded-lg transition-all duration-300 ease-out shadow-sm"
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
              ref={(el) => {
                buttonRefs.current[period.value] = el;
              }}
              onClick={() => updatePeriod(period.value)}
              className={`
                relative z-10 px-4 py-2 text-sm font-semibold rounded-md
                transition-all duration-200
                ${
                  isActive
                    ? "text-white"
                    : "text-muted hover:text-foreground"
                }
              `}
            >
              {t(period.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
