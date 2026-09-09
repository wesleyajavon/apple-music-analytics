"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { CRYSTAL_CHART_AXIS, getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import { useChartHeight, useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { useTheme } from "@/lib/providers/theme-provider";

export type ArtistsBarPoint = {
  name: string;
  fullName: string;
  listens: number;
};

export function ArtistsLeaderboardChart({
  data,
  locale,
}: {
  data: ArtistsBarPoint[];
  locale: string;
}) {
  const t = useTranslations("artists");
  const { resolvedTheme } = useTheme();
  const themeName = resolvedTheme === "dark" ? "dark" : "light";
  const axis = CRYSTAL_CHART_AXIS[themeName];
  const isLgChart = useIsLgChartViewport();
  const baseChartHeight = useChartHeight("tracksMain");
  const height = Math.max(baseChartHeight, data.length * 32 + 16);
  const fill = getCrystalSeriesColor(0, themeName);

  return (
    <ChartResponsiveContainer token="tracksMain" heightOverride={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 28, left: isLgChart ? 104 : 88, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="0" stroke={axis.grid} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: axis.tick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          type="category"
          dataKey="name"
          interval={0}
          tick={{ fill: axis.tick, fontSize: 12, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          width={96}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
          formatter={(value: number, name: string, props: { payload?: { fullName?: string } }) => {
            const fullName = props?.payload?.fullName;
            if (name === "listens") {
              return [`${value.toLocaleString(locale)} ${t("listensCount")}`, fullName || t("artistTooltip")];
            }
            return [value, name];
          }}
        />
        <Bar dataKey="listens" fill={fill} radius={[0, 10, 10, 0]} />
      </BarChart>
    </ChartResponsiveContainer>
  );
}

export function ArtistsLeaderboardChartSkeleton() {
  return (
    <div className="h-[640px]" aria-busy="true">
      <div className="flex h-full flex-col justify-between">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div
              className="h-5 animate-pulse rounded-r-lg bg-black/10 dark:bg-white/10"
              style={{ width: `${35 + ((index * 13) % 55)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
