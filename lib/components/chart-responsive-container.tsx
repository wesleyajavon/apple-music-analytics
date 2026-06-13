"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import type { ChartHeightToken } from "@/lib/constants/chart-layout";
import { useChartHeight, useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";

type ChartResponsiveContainerProps = {
  token: ChartHeightToken;
  children: ReactElement;
  className?: string;
  /** Enables horizontal scroll on viewports below lg when set */
  minWidth?: number;
  /** Overrides token-based height when a chart needs more vertical space (e.g. dense bar charts). */
  heightOverride?: number;
};

export function ChartResponsiveContainer({
  token,
  children,
  className = "",
  minWidth,
  heightOverride,
}: ChartResponsiveContainerProps) {
  const tokenHeight = useChartHeight(token);
  const height = heightOverride ?? tokenHeight;
  const isLg = useIsLgChartViewport();
  const enableScroll = !isLg && minWidth != null && minWidth > 0;

  const chart = (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );

  if (enableScroll) {
    return (
      <div className={`w-full min-w-0 ${className}`.trim()}>
        <div className="-mx-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
          <div style={{ minWidth, height }}>{chart}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 ${className}`.trim()} style={{ height }}>
      {chart}
    </div>
  );
}
