/**
 * Crystal Overview charts — Apple Health / Swift Charts vocabulary.
 * Plot on the canvas. Not DASHBOARD_CHART_THEME (legacy dashboard grids).
 */

/** Soundprint violet / rose / cyan first, then iOS-like system hues. */
export const CRYSTAL_SERIES_COLORS_LIGHT = [
  "#9850d0",
  "#f04068",
  "#4f90e0",
  "#bf5af2",
  "#ff9f0a",
  "#30d158",
  "#64d2ff",
  "#5e5ce6",
  "#ff6482",
  "#c6a27a",
] as const;

/** Brighter on dark canvas so series stay readable. */
export const CRYSTAL_SERIES_COLORS_DARK = [
  "#b06cff",
  "#ff5a86",
  "#67b0ff",
  "#da8fff",
  "#ffb340",
  "#63e68a",
  "#7adeff",
  "#7d7aff",
  "#ff8aa3",
  "#d4b896",
] as const;

export type CrystalChartThemeName = "light" | "dark";

export const CRYSTAL_CHART_AXIS = {
  light: {
    tick: "rgb(109 102 128)",
    grid: "rgb(23 19 33 / 0.08)",
    cursor: "rgb(23 19 33 / 0.20)",
    activeDotStroke: "#ffffff",
  },
  dark: {
    tick: "rgb(165 154 184)",
    grid: "rgb(255 255 255 / 0.08)",
    cursor: "rgb(255 255 255 / 0.22)",
    activeDotStroke: "#0b0d16",
  },
} as const;

export const CRYSTAL_CHART_FILL = {
  singleTop: 0.28,
  multiTop: 0.16,
} as const;

export const CRYSTAL_CHART_STROKE_WIDTH = {
  single: 3,
  multi: 2.5,
} as const;

export function getCrystalSeriesPalette(
  theme: CrystalChartThemeName
): readonly string[] {
  return theme === "dark" ? CRYSTAL_SERIES_COLORS_DARK : CRYSTAL_SERIES_COLORS_LIGHT;
}

export function getCrystalSeriesColor(
  index: number,
  theme: CrystalChartThemeName = "light"
): string {
  const palette = getCrystalSeriesPalette(theme);
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  return palette[i % palette.length];
}
