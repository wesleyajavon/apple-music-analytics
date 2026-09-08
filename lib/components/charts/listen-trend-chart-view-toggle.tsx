"use client";

import { useTranslations } from "next-intl";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
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
        `${DASHBOARD_SEGMENTED_TRACK} w-full sm:w-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
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
            className={`${selected ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL} flex-1 sm:flex-none`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
