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
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
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
      <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-black/30">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.26),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(79,144,224,0.22),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
          aria-hidden
        />
        <div className="relative">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  <LiveStatusDot />
                  {t("momentumBadge")}
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  {t("recentEvolution")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  {t("listensPerMonth")}
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <ListenTrendChartViewToggle value={chartView} onChange={setChartView} />
                <Link
                  href={timelineHref}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
                >
                  {t("seeMore")}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          <div className="px-3 py-5 sm:px-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-3 shadow-2xl shadow-black/20 backdrop-blur sm:p-5">
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
        </div>
      </div>
    </div>
  );
}
