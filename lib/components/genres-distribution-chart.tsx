"use client";

import { memo, useCallback, useMemo, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import type { GenreChartRow } from "@/lib/components/genres-ranking-list";
import { CRYSTAL_CHART_AXIS, getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { useTheme } from "@/lib/providers/theme-provider";

export type GenreChartType = "pie" | "bar";

function createCustomTooltip(listensLabel: string, locale: string) {
  const T = memo(function GenreChartTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: GenreChartRow }>;
  }) {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="chart-tooltip-accessible min-w-[180px] p-4">
        <p className="font-semibold">{data.name}</p>
        <p className="chart-tooltip-secondary mt-1 text-sm">
          {data.count.toLocaleString(locale)} {listensLabel} · {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  });
  T.displayName = "GenreChartTooltip";
  return T;
}

function PieChartLegend({
  data,
  locale,
}: {
  data: Array<{ name: string; percentage: number }>;
  locale: string;
}) {
  const { resolvedTheme } = useTheme();
  const themeName = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className="mx-auto mt-4 grid max-w-3xl grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 md:grid-cols-4" role="list">
      {data.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-2" role="listitem">
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: getCrystalSeriesColor(index, themeName) }}
            aria-hidden
          />
          <span className="truncate text-[13px] text-foreground">{item.name}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-muted sm:text-xs">
            {item.percentage.toLocaleString(locale, { maximumFractionDigits: 1 })}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function GenreDistributionChartSkeleton({ type }: { type: GenreChartType }) {
  if (type === "pie") {
    return (
      <div className="flex h-[260px] items-center justify-center lg:h-[500px]" aria-busy="true">
        <div className="h-44 w-44 animate-pulse rounded-full border-[28px] border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/10 sm:h-60 sm:w-60 sm:border-[38px]" />
      </div>
    );
  }

  return (
    <div className="h-[300px] lg:h-[500px]" aria-busy="true">
      <div className="flex h-full items-end justify-between gap-3">
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="w-full animate-pulse rounded-t-lg bg-black/10 dark:bg-white/10"
            style={{ height: `${28 + ((index * 17) % 62)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function GenreDistributionChart({
  chartType,
  onChartTypeChange,
  isLoading,
  chartDisplayData,
}: {
  chartType: GenreChartType;
  onChartTypeChange: (type: GenreChartType) => void;
  isLoading: boolean;
  chartDisplayData: GenreChartRow[];
}) {
  const t = useTranslations("genres");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const themeName = resolvedTheme === "dark" ? "dark" : "light";
  const axis = CRYSTAL_CHART_AXIS[themeName];
  const isLgChart = useIsLgChartViewport();
  const CustomTooltip = useMemo(() => createCustomTooltip(t("listens"), locale), [locale, t]);
  const genresBarMinWidth = useMemo(
    () =>
      chartDisplayData.length > 6
        ? Math.max(280, chartDisplayData.length * (isLgChart ? 48 : 40))
        : undefined,
    [chartDisplayData.length, isLgChart]
  );

  const renderCustomLabel = useCallback((props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    const { cx, cy, midAngle, outerRadius, percent } = props;
    const pct = (percent ?? 0) * 100;
    if (pct <= 12 || cx == null || cy == null || midAngle == null || outerRadius == null) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground"
        style={{ fontSize: "clamp(9px, 2vw, 12px)" }}
      >
        {`${pct.toFixed(1)}%`}
      </text>
    );
  }, []);

  const chartToggle = (
    <div
      role="tablist"
      aria-label={t("chart")}
      className={`${DASHBOARD_SEGMENTED_TRACK} w-fit [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
    >
      <button
        type="button"
        role="tab"
        aria-selected={chartType === "pie"}
        onClick={() => onChartTypeChange("pie")}
        className={chartType === "pie" ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
      >
        {t("pie")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={chartType === "bar"}
        onClick={() => onChartTypeChange("bar")}
        className={chartType === "bar" ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
      >
        {t("bar")}
      </button>
    </div>
  );

  let chartBody: ReactNode;
  if (isLoading) {
    chartBody = <GenreDistributionChartSkeleton type={chartType} />;
  } else if (chartType === "pie") {
    chartBody = (
      <div className="relative min-w-0">
        <ChartResponsiveContainer token="genresPie">
          <PieChart>
            <Pie
              data={chartDisplayData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              innerRadius="38%"
              outerRadius="75%"
              paddingAngle={2}
              dataKey="value"
            >
              {chartDisplayData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}-${index}`}
                  fill={getCrystalSeriesColor(index, themeName)}
                  stroke={axis.activeDotStroke}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ChartResponsiveContainer>
        <PieChartLegend data={chartDisplayData} locale={locale} />
      </div>
    );
  } else {
    chartBody = (
      <div className="relative min-w-0">
        <ChartResponsiveContainer token="genresBar" minWidth={genresBarMinWidth}>
          <BarChart
            data={chartDisplayData}
            margin={{
              top: 18,
              right: 12,
              left: 0,
              bottom: isLgChart ? 80 : 64,
            }}
          >
            <CartesianGrid strokeDasharray="0" stroke={axis.grid} vertical={false} />
            <XAxis
              dataKey="name"
              angle={isLgChart ? -45 : -35}
              textAnchor="end"
              height={isLgChart ? 80 : 64}
              tick={{ fill: axis.tick, fontSize: isLgChart ? 10 : 9 }}
              stroke={axis.grid}
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: axis.tick, fontSize: 12 }}
              stroke={axis.grid}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: axis.tick, fontSize: 12 }} />
            <Bar dataKey="count" name={t("Listens")} radius={[8, 8, 0, 0]}>
              {chartDisplayData.map((entry, index) => (
                <Cell key={`bar-${entry.name}-${index}`} fill={getCrystalSeriesColor(index, themeName)} />
              ))}
            </Bar>
          </BarChart>
        </ChartResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-muted">{t("chart")}</span>
        {chartToggle}
      </div>
      {chartBody}
    </div>
  );
}
