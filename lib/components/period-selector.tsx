"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

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

  const currentPeriod = (searchParams.get("period") as PeriodType) || "day";

  const updatePeriod = useCallback(
    (period: PeriodType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Agrégation :
      </span>
      {periods.map((period) => {
        const isActive = currentPeriod === period.value;
        return (
          <button
            key={period.value}
            onClick={() => updatePeriod(period.value)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-colors
              ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }
            `}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}


