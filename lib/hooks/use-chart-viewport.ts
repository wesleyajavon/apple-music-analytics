"use client";

import { useSyncExternalStore } from "react";
import { CHART_HEIGHTS, type ChartHeightToken } from "@/lib/constants/chart-layout";

const LG_MEDIA_QUERY = "(min-width: 1024px)";

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(LG_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getIsLgSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(LG_MEDIA_QUERY).matches;
}

/** SSR: assume mobile height to avoid oversized charts on first paint. */
function getIsLgServerSnapshot() {
  return false;
}

export function useIsLgChartViewport(): boolean {
  return useSyncExternalStore(subscribe, getIsLgSnapshot, getIsLgServerSnapshot);
}

export function useChartHeight(token: ChartHeightToken): number {
  const isLg = useIsLgChartViewport();
  const sizes = CHART_HEIGHTS[token];
  return isLg ? sizes.desktop : sizes.mobile;
}
