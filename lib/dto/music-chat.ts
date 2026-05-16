import type { AiLocale } from "@/lib/services/ai/locale-utils";

/** Rolling UTC calendar-day window for the late-night preset (bounded workload vs full history). */
export const LATE_NIGHT_PRESET_RECENT_WINDOW_DAYS = 90;

export type MusicChatRole = "user" | "assistant";

export type MusicChatMessage = {
  role: MusicChatRole;
  content: string;
};

export type MusicChatDateRangeContext = {
  startDate?: string;
  endDate?: string;
  isAll?: boolean;
};

/** Optional structured fields for preset requests (e.g. artist deep dive). */
export type MusicChatPresetArgs = {
  artistName?: string;
  /** Compare two calendar years (genre / compare presets). */
  earlierYear?: number;
  laterYear?: number;
  /** Calendar year for genre-last-year preset (optional; server can derive). */
  genreYear?: number;
};

export type MusicChatPresetQuestionId =
  | "summer-2022-top-tracks"
  | "summer-2022-top-artists"
  | "consistent-artists"
  | "late-night-habits"
  | "artist-deep-dive"
  | "taste-shift-2020-2024"
  | "track-obsessions-2022"
  | "genre-breakdown-last-year"
  | "compare-listening-periods"
  | "yearly-listening-trends";

export type MusicChatSource =
  | "getTopTracksForPeriod"
  | "getTrackObsessionWindows"
  | "getTopArtistsForPeriod"
  | "getGenreBreakdownForPeriod"
  | "compareListeningPeriods"
  | "getTasteShiftSummary"
  | "getListeningTrendsByYear"
  | "getMostConsistentArtistsOverTime"
  | "getListeningHabitsByTimeOfDay"
  | "getLateNightListeningProfile"
  | "getArtistDeepDive"
  | "resolveDateRange";

export type MusicChatToolResult = {
  toolName: MusicChatSource;
  args: Record<string, unknown>;
  result: unknown;
};

export type MusicChatResponse = {
  answer: string;
  sources: MusicChatToolResult[];
  locale: AiLocale;
  presetQuestionId?: MusicChatPresetQuestionId;
  aiUnavailable?: boolean;
  aiUnavailableReason?: "env" | "client";
};
