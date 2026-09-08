"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { OverviewTrendsTooltip } from "@/lib/components/charts/overview-trends-tooltip";
import type { ChartHeightToken } from "@/lib/constants/chart-layout";
import {
  CRYSTAL_CHART_AXIS,
  CRYSTAL_CHART_FILL,
  CRYSTAL_CHART_STROKE_WIDTH,
} from "@/lib/constants/crystal-chart";
import { useTheme } from "@/lib/providers/theme-provider";

export type OverviewTrendsChartSeries = {
  dataKey: string;
  name: string;
  color: string;
};

export type OverviewTrendsChartPoint = Record<string, unknown>;

export type OverviewTrendsChartProps = {
  data: OverviewTrendsChartPoint[];
  series: OverviewTrendsChartSeries[];
  formatValue: (value: number) => string;
  xKey?: string;
  minWidth?: number;
  heightToken?: ChartHeightToken;
};

export function OverviewTrendsChart({
  data,
  series,
  formatValue,
  xKey = "formattedDate",
  minWidth,
  heightToken = "trendsLine",
}: OverviewTrendsChartProps) {
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const axis = CRYSTAL_CHART_AXIS[resolvedTheme === "dark" ? "dark" : "light"];
  const isSingle = series.length <= 1;
  const fillTop = isSingle ? CRYSTAL_CHART_FILL.singleTop : CRYSTAL_CHART_FILL.multiTop;
  const strokeWidth = isSingle
    ? CRYSTAL_CHART_STROKE_WIDTH.single
    : CRYSTAL_CHART_STROKE_WIDTH.multi;

  const tooltipContent = useMemo(
    () => <OverviewTrendsTooltip formatValue={formatValue} />,
    [formatValue]
  );

  const yTickFormatter = useMemo(
    () => (value: number) =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value),
    [locale]
  );

  return (
    <ChartResponsiveContainer token={heightToken} minWidth={minWidth}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={axis.grid} strokeDasharray="0" />
        <XAxis
          dataKey={xKey}
          interval="preserveStartEnd"
          minTickGap={28}
          tick={{ fill: axis.tick, fontSize: 12, fontWeight: 400 }}
          stroke={axis.grid}
          axisLine={false}
          tickLine={false}
          height={36}
        />
        <YAxis
          tick={{ fill: axis.tick, fontSize: 12, fontWeight: 400 }}
          stroke={axis.grid}
          axisLine={false}
          tickLine={false}
          width={40}
          tickCount={3}
          tickFormatter={yTickFormatter}
        />
        <Tooltip
          content={tooltipContent}
          cursor={{ stroke: axis.cursor, strokeWidth: 1 }}
          wrapperStyle={{ outline: "none", zIndex: 20 }}
        />
        {series.map((item) => (
          <Area
            key={`area-${item.dataKey}`}
            type="monotone"
            dataKey={item.dataKey}
            name={item.name}
            stroke="none"
            fill={item.color}
            fillOpacity={fillTop}
            tooltipType="none"
            legendType="none"
            dot={false}
            activeDot={false}
            baseValue={0}
            animationDuration={600}
            animationEasing="ease-out"
          />
        ))}
        {series.map((item) => (
          <Line
            key={`line-${item.dataKey}`}
            type="monotone"
            dataKey={item.dataKey}
            name={item.name}
            stroke={item.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 2,
              fill: item.color,
              stroke: axis.activeDotStroke,
            }}
            animationDuration={600}
            animationEasing="ease-out"
          />
        ))}
      </ComposedChart>
    </ChartResponsiveContainer>
  );
}
