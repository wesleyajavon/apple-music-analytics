/**
 * DTOs for Week-to-Week Taste Evolution feature.
 * Structured output from deterministic trend computation.
 */

/** Time range for a single week (ISO date strings, week start) */
export interface WeekTimeRange {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  label: string; // e.g. "Semaine du 15 jan."
}

/** Genre with percentage change week-over-week */
export interface GenreDelta {
  genre: string;
  previousPct: number;
  currentPct: number;
  deltaPct: number; // current - previous
  previousCount: number;
  currentCount: number;
}

/** Artist rank movement week-over-week */
export interface ArtistRankMovement {
  artistName: string;
  previousRank: number | null; // null = new in top N
  currentRank: number;
  rankChange: number; // negative = moved up, positive = moved down
  previousCount: number;
  currentCount: number;
}

/**
 * Trend classification types.
 * Determined by deterministic rules (see taste-evolution-core.ts).
 */
export type TrendClassification =
  | "expansion" // more genres / higher diversity
  | "consolidation" // fewer genres / deeper focus
  | "exploration" // new genres or artists appearing
  | "regression" // return to previous patterns
  | "stable"; // no significant change

/** Dominant shifts: genres or artists with meaningful changes */
export interface DominantShift {
  type: "genre" | "artist";
  name: string;
  direction: "up" | "down";
  magnitude: number; // percentage points or rank positions
  classification: TrendClassification;
}

/** Single week-to-week trend object */
export interface WeekToWeekTrend {
  timeRange: WeekTimeRange;
  previousWeekRange: WeekTimeRange;
  /** Volume change (listens count) */
  volumeDelta: number;
  volumeDeltaPct: number;
  /** Diversity: entropy or genre count change */
  diversityDelta: number;
  genreCountPrevious: number;
  genreCountCurrent: number;
  /** Genres gaining share (above noise threshold) */
  emergingGenres: GenreDelta[];
  /** Genres losing share (above noise threshold) */
  decliningGenres: GenreDelta[];
  /** Top artist rank movements */
  artistRankMovements: ArtistRankMovement[];
  /** Classified dominant shifts */
  dominantShifts: DominantShift[];
  /** Overall trend classification for this week pair */
  classification: TrendClassification;
  /** Minimum listens required for week to be considered (data quality) */
  previousWeekListens: number;
  currentWeekListens: number;
}

/** Full API response */
export interface TasteEvolutionResponse {
  trends: WeekToWeekTrend[];
  /** AI-generated narrative, technical version (with percentages, metrics) */
  commentary: string | null;
  /** AI-generated narrative, light version (easy to read, no percentages) */
  commentaryLight: string | null;
  commentaryCached?: boolean;
  /** Weeks with insufficient data (excluded from trends) */
  skippedWeeks: Array<{ weekStart: string; reason: string }>;
}
