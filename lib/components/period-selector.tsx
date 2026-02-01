"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOptimisticFilters } from "@/lib/hooks/use-optimistic-filters";

export type PeriodType = "day" | "week" | "month";

interface PeriodOption {
  label: string;
  value: PeriodType;
}

const periods: PeriodOption[] = [
  { label: "Quotidien", value: "day" },
  { label: "Hebdomadaire", value: "week" },
  { label: "Mensuel", value: "month" },
];

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { prefetchWithOptimisticUpdate } = useOptimisticFilters();

  const currentPeriod = (searchParams.get("period") as PeriodType) || "day";
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
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
        Agrégation
      </span>
      <div
        ref={containerRef}
        className="relative flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50"
      >
        {indicatorStyle && (
          <div
            className="absolute h-[calc(100%-12px)] top-1.5 bg-accent-violet rounded-lg transition-all duration-300 ease-out shadow-sm"
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
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              `}
            >
              {period.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}







