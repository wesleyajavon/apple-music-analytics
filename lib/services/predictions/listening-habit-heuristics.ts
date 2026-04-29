/**
 * Pure heuristic functions for "When Will I Listen?" prediction.
 *
 * ASSUMPTIONS & LIMITATIONS (documented for transparency):
 * 1. Users have recurring weekly patterns (e.g. listen more on weekends, evenings).
 * 2. Same day of week is more predictive than cross-day (Monday habits differ from Saturday).
 * 3. 2-hour windows capture typical listening sessions without over-fitting to single hours.
 * 4. Genre is derived from track.genre (Last.fm) - null/Unknown reduces genre prediction quality.
 * 5. Confidence = proportion of listens in the peak window; higher = more consistent habit.
 *
 * NO ML LIBRARIES - deterministic, testable, explainable.
 */

import type {
  ListeningHabitPrediction,
  SupportingMetrics,
  TimeWindow,
} from "@/lib/dto/predictions";

/** Raw row from DB: hour, day_of_week, genre, count */
export interface HourDayGenreRow {
  hour: number;
  day_of_week: number;
  genre: string;
  count: number;
}

/** Minimum listens required to make a prediction (avoids noise from sparse data) */
export const MIN_LISTENS_FOR_PREDICTION = 30;

/** Window size in hours (e.g. 2 = 21h-23h) */
const TIME_WINDOW_HOURS = 2;

/** Assumptions documented for API consumers */
const DOCUMENTED_ASSUMPTIONS = [
  "Prediction based on historical listening patterns for the same day of week.",
  "Uses last 90 days of data. More data = more reliable prediction.",
  "Time window is 2 hours. Peak hour is the hour with most listens.",
  "Genre is the most frequent genre in that time window (from track metadata).",
  "Confidence = % of listens in the peak window on that weekday.",
];

/**
 * Formats a time window as human-readable label (e.g. "21h–23h").
 */
function formatTimeWindow(startHour: number, endHour: number): string {
  return `${startHour}h–${endHour}h`;
}

/**
 * Computes the predicted time window from hour-of-day distribution.
 * Heuristic: Find the hour with most listens, then expand to a 2-hour window
 * that maximizes total listens (centered on peak when possible).
 *
 * @param hourCounts - Map of hour (0-23) -> listen count for today's day of week
 * @returns TimeWindow with startHour, endHour, label
 */
export function computeTimeWindow(
  hourCounts: Map<number, number>
): TimeWindow | null {
  if (hourCounts.size === 0) return null;

  let peakHour = 0;
  let maxCount = 0;
  for (const [hour, count] of hourCounts) {
    if (count > maxCount) {
      maxCount = count;
      peakHour = hour;
    }
  }
  if (maxCount === 0) return null;

  // Build 2-hour window centered on peak, but clamp to 0-23
  // Prefer window that captures the most listens
  let bestStart = Math.max(0, peakHour - 1);
  let bestEnd = Math.min(23, bestStart + TIME_WINDOW_HOURS - 1);
  if (bestEnd - bestStart < TIME_WINDOW_HOURS - 1) {
    bestStart = Math.max(0, bestEnd - TIME_WINDOW_HOURS + 1);
  }

  // Ensure we have a valid 2-hour window
  const windowHours = bestEnd - bestStart + 1;
  if (windowHours < 1) {
    bestStart = peakHour;
    bestEnd = Math.min(23, peakHour + 1);
  }

  return {
    startHour: bestStart,
    endHour: bestEnd,
    label: formatTimeWindow(bestStart, bestEnd),
  };
}

/**
 * Computes confidence score (0-100).
 * Heuristic: (listens in window / total listens on that day) * 100.
 * Capped at 95 to avoid overconfidence from very sparse data.
 *
 * @param listensInWindow - Listens in the predicted time window
 * @param totalListensOnDay - Total listens on that day of week in the analysis period
 */
export function computeConfidenceScore(
  listensInWindow: number,
  totalListensOnDay: number
): number {
  if (totalListensOnDay === 0) return 0;
  const raw = (listensInWindow / totalListensOnDay) * 100;
  return Math.min(95, Math.round(raw * 10) / 10); // 1 decimal, cap at 95
}

/**
 * Gets the most frequent genre in the given time window from the raw rows.
 *
 * @param rows - Rows filtered to the time window and day of week
 * @returns Genre name (or "Unknown" if none)
 */
export function computePredictedGenre(
  rows: HourDayGenreRow[],
  startHour: number,
  endHour: number,
  dayOfWeek: number
): string {
  const genreCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.day_of_week !== dayOfWeek) continue;
    if (row.hour < startHour || row.hour > endHour) continue;
    const current = genreCounts.get(row.genre) ?? 0;
    genreCounts.set(row.genre, current + row.count);
  }

  let topGenre = "Unknown";
  let maxCount = 0;
  for (const [genre, count] of genreCounts) {
    if (count > maxCount && genre && genre !== "Unknown") {
      maxCount = count;
      topGenre = genre;
    }
  }
  if (maxCount === 0 && genreCounts.size > 0) {
    topGenre = [...genreCounts.keys()][0] ?? "Unknown";
  }
  return topGenre;
}

/**
 * Builds genre distribution map for the time window (for supporting metrics).
 */
export function buildGenreDistributionInWindow(
  rows: HourDayGenreRow[],
  startHour: number,
  endHour: number,
  dayOfWeek: number
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const row of rows) {
    if (row.day_of_week !== dayOfWeek) continue;
    if (row.hour < startHour || row.hour > endHour) continue;
    dist[row.genre] = (dist[row.genre] ?? 0) + row.count;
  }
  return dist;
}

const DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/**
 * Main prediction function - pure heuristics, no I/O.
 *
 * @param rows - Raw DB rows: hour, day_of_week, genre, count
 * @param targetDayOfWeek - Today's day of week (0-6)
 * @param totalListensAnalyzed - Total listens in the analysis period
 * @param daysOfData - Number of days of data used
 * @param includeSupportingMetrics - Whether to include debugging metrics
 */
export function computeListeningHabitPrediction(
  rows: HourDayGenreRow[],
  targetDayOfWeek: number,
  totalListensAnalyzed: number,
  daysOfData: number,
  includeSupportingMetrics: boolean = true
): ListeningHabitPrediction | null {
  // Filter to target day of week
  const dayRows = rows.filter((r) => r.day_of_week === targetDayOfWeek);
  if (dayRows.length === 0) return null;

  // Build hour -> count for this day
  const hourCounts = new Map<number, number>();
  let totalOnDay = 0;
  for (const row of dayRows) {
    const current = hourCounts.get(row.hour) ?? 0;
    hourCounts.set(row.hour, current + row.count);
    totalOnDay += row.count;
  }

  const timeWindow = computeTimeWindow(hourCounts);
  if (!timeWindow) return null;

  // Listens in window
  let listensInWindow = 0;
  for (let h = timeWindow.startHour; h <= timeWindow.endHour; h++) {
    listensInWindow += hourCounts.get(h) ?? 0;
  }

  const confidenceScore = computeConfidenceScore(listensInWindow, totalOnDay);
  const predictedGenre = computePredictedGenre(
    rows,
    timeWindow.startHour,
    timeWindow.endHour,
    targetDayOfWeek
  );

  const supportingMetrics: SupportingMetrics | undefined =
    includeSupportingMetrics
      ? {
          totalListensAnalyzed,
          daysOfData,
          listensInWindow,
          peakHour: [...hourCounts.entries()].reduce((a, b) =>
            (a[1] > b[1] ? a : b)
          )[0],
          dayOfWeek: targetDayOfWeek,
          dayName: DAY_NAMES[targetDayOfWeek],
          genreDistributionInWindow: buildGenreDistributionInWindow(
            rows,
            timeWindow.startHour,
            timeWindow.endHour,
            targetDayOfWeek
          ),
          assumptions: DOCUMENTED_ASSUMPTIONS,
        }
      : undefined;

  return {
    timeWindow,
    confidenceScore,
    predictedGenre,
    supportingMetrics,
  };
}
