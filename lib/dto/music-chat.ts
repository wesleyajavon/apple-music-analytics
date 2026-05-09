import type { AiLocale } from "@/lib/services/ai/locale-utils";

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

export type MusicChatPresetQuestionId =
  | "summer-2022-top-tracks"
  | "consistent-artists"
  | "late-night-habits"
  | "artist-deep-dive"
  | "taste-shift-2020-2024"
  | "track-obsessions-2022";

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
