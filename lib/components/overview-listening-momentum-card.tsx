"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { ListenTrendChartViewToggle } from "@/lib/components/charts/listen-trend-chart-view-toggle";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
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
  const [chartView, setChartView] = useState<ListenTrendChartViewMode>("period");

  const displayChartData = useMemo(
    () => applyListenTrendChartViewSingle(chartData, chartView, "listens"),
    [chartData, chartView]
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
        <ChartResponsiveContainer
          token="overviewArea"
          minWidth={chartData.length > 8 ? Math.max(300, chartData.length * 28) : undefined}
        >
          <AreaChart data={displayChartData} margin={{ top: 10, right: 14, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="overviewMomentumAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.34} />
                <stop offset="48%" stopColor="#a78bfa" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
            <XAxis
              dataKey="formattedDate"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
              labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
              itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
              formatter={(value: number) => [
                `${value.toLocaleString(locale)} ${t("listens")}`,
                t("Listens"),
              ]}
            />
            <Area
              type="monotone"
              dataKey="listens"
              stroke="#67e8f9"
              strokeWidth={3}
              fill="url(#overviewMomentumAreaGradient)"
              animationDuration={600}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ChartResponsiveContainer>
      </div>
    </div>
  );
}
