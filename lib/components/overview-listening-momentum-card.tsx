"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewTrendsChart } from "@/lib/components/charts/overview-trends-chart";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";
import {
  applyListenTrendChartViewSingle,
  type ListenTrendChartViewMode,
} from "@/lib/utils/listen-trend-chart-view";

export type OverviewListeningMomentumPoint = {
  formattedDate: string;
  listens: number;
};

export type OverviewListeningMomentumCardProps = {
  chartData: OverviewListeningMomentumPoint[];
  timelineHref: string;
};

export function OverviewListeningMomentumCard({
  chartData,
  timelineHref,
}: OverviewListeningMomentumCardProps) {
  const t = useTranslations("overview");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");
  const chartThemeName = resolvedTheme === "dark" ? "dark" : "light";

  const displayChartData = useMemo(
    () => applyListenTrendChartViewSingle(chartData, chartView, "listens"),
    [chartData, chartView]
  );

  const formatValue = useCallback(
    (value: number) => `${value.toLocaleString(locale)} ${t("listens")}`,
    [locale, t]
  );

  const series = useMemo(
    () => [
      {
        dataKey: "listens",
        name: t("Listens"),
        color: getCrystalSeriesColor(2, chartThemeName),
      },
    ],
    [chartThemeName, t]
  );

  if (chartData.length === 0) return null;

  return (
    <div className="min-h-[240px] w-full min-w-0 sm:min-h-[280px] lg:min-h-[320px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("momentumBadge")}</p>
          <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{t("recentEvolution")}</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{t("listensPerMonth")}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
          <Link href={timelineHref} className={`${DASHBOARD_BTN_GHOST} shrink-0`}>
            {t("seeMore")}
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <OverviewTrendsChart
          data={displayChartData}
          series={series}
          formatValue={formatValue}
          heightToken="overviewArea"
          minWidth={chartData.length > 8 ? Math.max(300, chartData.length * 28) : undefined}
        />
      </div>
    </div>
  );
}
