"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

export type DateRangePreset = "7d" | "30d" | "90d" | "1y" | "all";

interface DateRange {
  label: string;
  startDate: Date | null;
  endDate: Date | null;
}

const presets: Record<DateRangePreset, DateRange> = {
  "7d": {
    label: "7 derniers jours",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    })(),
    endDate: new Date(),
  },
  "30d": {
    label: "30 derniers jours",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    })(),
    endDate: new Date(),
  },
  "90d": {
    label: "90 derniers jours",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 90);
      return date;
    })(),
    endDate: new Date(),
  },
  "1y": {
    label: "1 an",
    startDate: (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() - 1);
      return date;
    })(),
    endDate: new Date(),
  },
  all: {
    label: "Tout",
    startDate: null,
    endDate: null,
  },
};

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPreset =
    (searchParams.get("preset") as DateRangePreset) || "30d";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const updateDateRange = useCallback(
    (preset: DateRangePreset) => {
      const range = presets[preset];
      const params = new URLSearchParams(searchParams.toString());

      if (preset === "all") {
        params.delete("preset");
        params.delete("startDate");
        params.delete("endDate");
      } else {
        params.set("preset", preset);
        if (range.startDate) {
          params.set("startDate", range.startDate.toISOString().split("T")[0]);
        }
        if (range.endDate) {
          params.set("endDate", range.endDate.toISOString().split("T")[0]);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
          Période :
        </span>
        {Object.entries(presets).map(([key, preset]) => {
          const isActive = currentPreset === key;
          return (
            <button
              key={key}
              onClick={() => updateDateRange(key as DateRangePreset)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }
              `}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

