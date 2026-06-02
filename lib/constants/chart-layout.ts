/**
 * Chart heights: mobile (< lg) vs desktop (lg+).
 * Desktop values match existing layouts; mobile values reduce vertical scroll.
 */
export type ChartHeightToken =
  | "overviewArea"
  | "trendsLine"
  | "timelineMain"
  | "spotlightBar"
  | "temporalMain"
  | "tracksMain"
  | "genresPie"
  | "genresBar"
  | "paletteMini"
  | "insightsHourBar"
  | "insightsWeekdayBar";

export const CHART_HEIGHTS: Record<
  ChartHeightToken,
  { mobile: number; desktop: number }
> = {
  overviewArea: { mobile: 220, desktop: 280 },
  trendsLine: { mobile: 240, desktop: 290 },
  timelineMain: { mobile: 280, desktop: 500 },
  spotlightBar: { mobile: 280, desktop: 360 },
  temporalMain: { mobile: 260, desktop: 400 },
  tracksMain: { mobile: 280, desktop: 500 },
  genresPie: { mobile: 260, desktop: 500 },
  genresBar: { mobile: 300, desktop: 500 },
  paletteMini: { mobile: 160, desktop: 180 },
  insightsHourBar: { mobile: 168, desktop: 176 },
  insightsWeekdayBar: { mobile: 132, desktop: 144 },
};
