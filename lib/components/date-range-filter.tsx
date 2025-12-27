"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useRef, useEffect, useState } from "react";

export type DateRangePreset = "7d" | "30d" | "ytd" | "all";

interface DateRange {
  label: string;
  startDate: Date | null;
  endDate: Date | null;
}

const getYearToDateRange = (): DateRange => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  return {
    label: "YTD",
    startDate: startOfYear,
    endDate: now,
  };
};

const presets: Record<DateRangePreset, DateRange> = {
  "7d": {
    label: "7d",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    })(),
    endDate: new Date(),
  },
  "30d": {
    label: "30d",
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date;
    })(),
    endDate: new Date(),
  },
  ytd: getYearToDateRange(),
  all: {
    label: "All",
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
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Calcule la position de l'indicateur actif
  useEffect(() => {
    const activeButton = buttonRefs.current[currentPreset];
    if (activeButton && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [currentPreset]);

  // Recalculer la position lors du redimensionnement de la fenêtre
  useEffect(() => {
    const handleResize = () => {
      const activeButton = buttonRefs.current[currentPreset];
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
  }, [currentPreset]);

  const updateDateRange = useCallback(
    (preset: DateRangePreset) => {
      // Recalculer YTD au moment du clic pour avoir la date actuelle
      const range =
        preset === "ytd" ? getYearToDateRange() : presets[preset];
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

  const presetEntries = Object.entries(presets) as [
    DateRangePreset,
    DateRange,
  ][];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
          Période :
        </span>
        <div
          ref={containerRef}
          className="relative flex items-center gap-2"
        >
          {/* Indicateur animé pour le bouton actif */}
          {indicatorStyle && (
            <div
              className="absolute h-8 bg-blue-600 rounded-md transition-all duration-300 ease-out"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
              }}
            />
          )}
          {presetEntries.map(([key, preset]) => {
            const isActive = currentPreset === key;
            return (
              <button
                key={key}
                ref={(el) => {
                  buttonRefs.current[key] = el;
                }}
                onClick={() => updateDateRange(key)}
                className={`
                  relative z-10 px-4 py-1.5 text-sm font-medium rounded-md
                  transition-all duration-200 ease-out
                  ${
                    isActive
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }
                `}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

