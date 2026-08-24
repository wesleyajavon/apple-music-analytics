"use client";

import { useTranslations } from "next-intl";
import type { ListenTrendChartViewMode } from "@/lib/utils/listen-trend-chart-view";

export type { ListenTrendChartViewMode };

export function ListenTrendChartViewToggle({
  value,
  onChange,
  className,
}: {
  value: ListenTrendChartViewMode;
  onChange: (mode: ListenTrendChartViewMode) => void;
  className?: string;
}) {
  const t = useTranslations("components.listenTrendChartView");

  const segments: { value: ListenTrendChartViewMode; label: string }[] = [
    { value: "period", label: t("period") },
    { value: "cumulative", label: t("cumulative") },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("label")}
      className={
        className ??
        "inline-flex w-full flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-black/30 sm:w-auto"
      }
    >
      {segments.map((segment) => {
        const selected = value === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(segment.value)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:flex-none ${
              selected
                ? "bg-white text-violet-800 shadow-sm dark:bg-violet-500/20 dark:text-violet-100"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
