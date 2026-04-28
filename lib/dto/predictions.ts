/**
 * DTOs for listening habit predictions
 * "When Will I Listen?" feature - deterministic heuristics, no ML
 */

/**
 * Time window for predicted listening (e.g. "21h–23h")
 */
export interface TimeWindow {
  /** Start hour (0-23) inclusive */
  startHour: number;
  /** End hour (0-23) inclusive */
  endHour: number;
  /** Human-readable label (e.g. "21h–23h") */
  label: string;
}

/**
 * Supporting metrics for debugging and transparency.
 * Explains how the prediction was computed.
 */
export interface SupportingMetrics {
  /** Total listens used for the prediction (historical data) */
  totalListensAnalyzed: number;
  /** Number of days of data used */
  daysOfData: number;
  /** Listens in the predicted time window on same weekday */
  listensInWindow: number;
  /** Peak hour (0-23) - hour with most listens */
  peakHour: number;
  /** Day of week used (0=Sunday, 1=Monday, ...) */
  dayOfWeek: number;
  /** Day name in French */
  dayName: string;
  /** Genre distribution in the time window (genre -> count) */
  genreDistributionInWindow: Record<string, number>;
  /** Assumptions documented for transparency */
  assumptions: string[];
}

/**
 * Prediction result from deterministic heuristics.
 * AI is NOT used to compute this - only to explain it optionally.
 */
export interface ListeningHabitPrediction {
  /** Most likely time window for today (e.g. 21–23) */
  timeWindow: TimeWindow;
  /** Confidence score 0–100. Represents: proportion of historical listens
   * that fall in this window on the same weekday. Higher = more consistent habit. */
  confidenceScore: number;
  /** Most likely genre for that time window */
  predictedGenre: string;
  /** Optional metrics for debugging and AI explanation input */
  supportingMetrics?: SupportingMetrics;
}

/**
 * Response when insufficient data for prediction
 */
export interface InsufficientDataResponse {
  /** Always true when data is insufficient */
  insufficientData: true;
  /** Minimum listens recommended */
  minListensRecommended: number;
  /** Actual listens available */
  actualListens: number;
  /** Suggestion message */
  message: string;
}

export type ListeningHabitResponse =
  | ListeningHabitPrediction
  | (InsufficientDataResponse & { insufficientData: true });
