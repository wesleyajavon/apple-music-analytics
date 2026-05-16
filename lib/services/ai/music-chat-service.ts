import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import {
  createGroqChatCompletion,
  GROQ_DEFAULT_MODEL,
} from "@/lib/services/ai/groq-chat";
import { getLanguageName, type AiLocale } from "@/lib/services/ai/locale-utils";
import {
  executeMusicChatTool,
  getLateNightPresetDateRange,
  getPresetQuestion,
} from "@/lib/services/ai/music-chat-tools";
import type {
  MusicChatDateRangeContext,
  MusicChatMessage,
  MusicChatPresetArgs,
  MusicChatPresetQuestionId,
  MusicChatResponse,
  MusicChatToolResult,
} from "@/lib/dto/music-chat";
import {
  buildMusicChatPresetCacheSuffix,
  buildMusicChatPresetStorageKey,
  getCachedMusicChatPresetResponse,
  getMusicChatPresetCacheTtlSeconds,
  setCachedMusicChatPresetResponse,
} from "@/lib/services/ai/music-chat-preset-cache";
import {
  formatTopArtistsPresetAnswer,
  isTopArtistsPeriodToolResult,
} from "@/lib/services/ai/music-chat-top-artists-direct-answer";
import {
  formatTopTracksPresetAnswer,
  isTopTracksPeriodToolResult,
} from "@/lib/services/ai/music-chat-top-tracks-direct-answer";
import {
  formatArtistDeepDivePresetAnswer,
  isArtistDeepDiveToolResult,
  resolveArtistNameForDeepDivePreset,
} from "@/lib/services/ai/music-chat-artist-deep-dive-direct-answer";
import { resolveGenreQuickPresetYear } from "@/lib/services/ai/music-chat-preset-helpers";
import {
  formatComparePeriodsPresetAnswer,
  formatConsistentArtistsPresetAnswer,
  formatGenreBreakdownPresetAnswer,
  formatLateNightPresetAnswer,
  formatTasteShiftPresetAnswer,
  formatTrackObsessionsPresetAnswer,
  formatYearlyTrendsPresetAnswer,
  isComparePeriodsToolResult,
  isConsistentArtistsToolResult,
  isGenreBreakdownToolResult,
  isLateNightProfileToolResult,
  isTasteShiftSummaryToolResult,
  isTrackObsessionsToolResult,
  isYearlyTrendsToolResult,
} from "@/lib/services/ai/music-chat-quick-preset-formatters";

const MAX_TOOL_STEPS = 4;
const MAX_HISTORY_MESSAGES = 8;
/** Groq output cap; long artist deep dives need room for many track lines + yearly rows. */
const MUSIC_CHAT_COMPLETION_MAX_TOKENS = 8192;

type DirectPresetToolCall = {
  id: string;
  toolName: MusicChatToolResult["toolName"];
  args: Record<string, unknown>;
};

const MUSIC_CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "resolveDateRange",
      description:
        "Resolve a natural date expression into explicit YYYY-MM-DD dates. Use it when the user says things like summer 2022, last year, this year, winter 2023, or recently.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string" },
          startDate: { type: "string", description: "Optional YYYY-MM-DD start date." },
          endDate: { type: "string", description: "Optional YYYY-MM-DD end date." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTopTracksForPeriod",
      description: "Get the user's most listened tracks for a specific date range.",
      parameters: {
        type: "object",
        required: ["startDate", "endDate"],
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTrackObsessionWindows",
      description:
        "Identify tracks with concentrated listening spikes in a short 7, 14, or 30 day window within an explicit period. Returns each track, artist, exact window, listens in the window, and total listens in the period.",
      parameters: {
        type: "object",
        required: ["startDate", "endDate"],
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          windowDays: {
            type: "number",
            enum: [7, 14, 30],
            description:
              "Short rolling window size in days. Only 7, 14, and 30 are allowed; defaults to 7.",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description: "Maximum obsession windows to return. Hard-capped at 10.",
          },
          minListensInWindow: {
            type: "number",
            minimum: 1,
            maximum: 20,
            description:
              "Minimum listens inside the short window. Hard-capped at 20 and defaults to 2.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTopArtistsForPeriod",
      description: "Get the user's most listened artists for a specific date range.",
      parameters: {
        type: "object",
        required: ["startDate", "endDate"],
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getGenreBreakdownForPeriod",
      description: "Get the user's genre breakdown for a specific date range.",
      parameters: {
        type: "object",
        required: ["startDate", "endDate"],
        properties: {
          startDate: { type: "string", description: "YYYY-MM-DD" },
          endDate: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compareListeningPeriods",
      description: "Compare top tracks and artists across two date ranges.",
      parameters: {
        type: "object",
        required: [
          "firstStartDate",
          "firstEndDate",
          "secondStartDate",
          "secondEndDate",
        ],
        properties: {
          firstStartDate: { type: "string", description: "YYYY-MM-DD" },
          firstEndDate: { type: "string", description: "YYYY-MM-DD" },
          secondStartDate: { type: "string", description: "YYYY-MM-DD" },
          secondEndDate: { type: "string", description: "YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTasteShiftSummary",
      description:
        "Compare two explicit date ranges and summarize taste shifts with top artists, top genres, rising deltas, declining deltas, strict result limits, and data quality flags. Use this for questions about how the user's taste changed between two periods.",
      parameters: {
        type: "object",
        required: [
          "firstStartDate",
          "firstEndDate",
          "secondStartDate",
          "secondEndDate",
        ],
        properties: {
          firstStartDate: { type: "string", description: "YYYY-MM-DD" },
          firstEndDate: { type: "string", description: "YYYY-MM-DD" },
          secondStartDate: { type: "string", description: "YYYY-MM-DD" },
          secondEndDate: { type: "string", description: "YYYY-MM-DD" },
          topLimit: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description: "Maximum top artists/genres per period. Hard-capped at 10.",
          },
          deltaLimit: {
            type: "number",
            minimum: 1,
            maximum: 10,
            description:
              "Maximum rising and declining deltas per entity type. Hard-capped at 10.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getListeningTrendsByYear",
      description: "Get annual listening counts and yearly coverage.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getMostConsistentArtistsOverTime",
      description:
        "Rank artists by long-term listening consistency across years and months.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getListeningHabitsByTimeOfDay",
      description:
        "Whole-day listening patterns by hour (0–23) and day of week, including the busiest hour overall. Use for generic time-of-day questions. Do not use this alone when the user asks specifically about late-night listening—use getLateNightListeningProfile instead.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Optional YYYY-MM-DD" },
          endDate: { type: "string", description: "Optional YYYY-MM-DD" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLateNightListeningProfile",
      description:
        "Late-night slice only: clock hours 22–03 (22:00 through 03:59). Returns share of listens in that window versus the full selected period, busiest hour within that window, per-hour counts inside the window, and top tracks, artists, and genres during those listens. Use for questions about nighttime or late-night listening habits.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Optional YYYY-MM-DD" },
          endDate: { type: "string", description: "Optional YYYY-MM-DD" },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 20,
            description: "Max rows each for top tracks, artists, and genres. Defaults to 10.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getArtistDeepDive",
      description:
        "Get a focused deep dive for one artist in the user's own listening history, including total listens, unique tracks, first and last listen, top tracks, and annual breakdown. Use exact artist names when possible.",
      parameters: {
        type: "object",
        required: ["artistName"],
        properties: {
          artistName: {
            type: "string",
            description: "Artist name to resolve within the user's listening data.",
          },
          startDate: { type: "string", description: "Optional YYYY-MM-DD" },
          endDate: { type: "string", description: "Optional YYYY-MM-DD" },
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
] as const;

function buildDateRangeInstruction(dateRange?: MusicChatDateRangeContext): string {
  if (!dateRange) {
    return "Do not invent a date range. If the user does not ask for a period and the tool accepts optional dates, omit startDate and endDate.";
  }

  if (dateRange.isAll) {
    const bounds =
      dateRange.startDate && dateRange.endDate
        ? ` The full data span is ${dateRange.startDate} to ${dateRange.endDate}.`
        : "";
    return `The active dashboard date filter is all time.${bounds} For artist deep dives, omit startDate and endDate unless the user explicitly asks for a narrower period. For tools that require dates, use the full data span when available.`;
  }

  if (dateRange.startDate && dateRange.endDate) {
    return `The active dashboard date filter is ${dateRange.startDate} to ${dateRange.endDate}. Use this range unless the user explicitly asks for a different period.`;
  }

  return "Do not invent a date range. If the user does not ask for a period and the tool accepts optional dates, omit startDate and endDate.";
}

function buildSystemPrompt(
  locale: AiLocale,
  dateRange?: MusicChatDateRangeContext
): string {
  const languageName = getLanguageName(locale);
  return [
    "You are Ask your Soundprint, a music analytics assistant.",
    `Answer in ${languageName}.`,
    "You can only answer from tool results, never from guesses.",
    "Use concise, friendly, data-grounded prose.",
    "Format every answer for easy reading: 2–4 short paragraphs separated by a blank line. When listing several comparable items (tracks, artists, time slots), use simple bullet lines starting with \"- \" (one item per line). Avoid a single dense wall of text.",
    "Never cram stats on one line as \"- A: 1 - B: 2 - C: 3\". Put one fact per line: blank line after the opening sentence, then a bullet list; each bullet is a single metric or year row.",
    "When you list top tracks, one track per \"- \" line with its listen count in parentheses. After that list, add a blank line, then a separate short sentence for the overall date span (first listen to last listen) — never append that sentence to the last track line.",
    buildDateRangeInstruction(dateRange),
    "If the user asks for an unsupported task, such as creating playlists, changing account data, writing SQL, deleting data, fetching external facts, or doing non-music-analytics work, do not call analytics tools just to be helpful. Politely say Ask your Soundprint cannot do that task and offer supported music analytics questions instead.",
    "Always mention the date range or interpretation you used when relevant.",
    "If a period has no data, say so clearly and suggest a nearby useful follow-up.",
    "For taste-shift comparisons, always name both periods. If the tool result includes a caution about sparse data, explain in plain language that the comparison may be weak because one period has very little data. If there is no caution, do not mention data quality.",
    "Never expose raw tool field names or metadata labels in the final answer.",
    "For track obsession windows, always mention the exact short window and the wider period total.",
    "Exact listening hours are allowed, but avoid dumping unnecessary raw rows.",
    "When the user asks about late-night or nighttime listening, summarize getLateNightListeningProfile only: top tracks, artists, genres, late-night share of listens, and the busiest hour inside the 22–03 window. Do not answer with the overall busiest hour of the entire day unless that hour falls in the late-night window.",
    "For consistency questions, explain the metric briefly.",
  ].join("\n");
}

function getUnsupportedMusicChatAnswer(locale: AiLocale): string {
  switch (locale) {
    case "fr":
      return [
        "Je ne peux pas faire cette tâche dans Ask your Soundprint.",
        "Je peux par contre analyser ton historique d'écoute : top titres, artistes et genres sur une période, comparaison de périodes, évolution de tes goûts, habitudes par heure ou jour, artistes les plus constants, deep dive artiste, et morceaux avec pics d'écoute.",
        "Essaie par exemple : \"Quels étaient mes titres les plus écoutés en 2022 ?\"",
      ].join("\n\n");
    case "es":
      return [
        "No puedo hacer esa tarea en Ask your Soundprint.",
        "Sí puedo analizar tu historial de escucha: canciones, artistas y géneros principales por periodo, comparación de periodos, cambios de gusto, hábitos por hora o día, artistas más constantes, deep dives de artistas y canciones con picos de escucha.",
        "Prueba con algo como: \"¿Cuáles fueron mis canciones más escuchadas en 2022?\"",
      ].join("\n\n");
    case "en":
    default:
      return [
        "I can't do that task in Ask your Soundprint.",
        "I can help analyze your listening history: top tracks, artists, and genres for a period; period comparisons; taste shifts; habits by hour or day; most consistent artists; artist deep dives; and tracks with listening spikes.",
        "Try something like: \"What were my top tracks in 2022?\"",
      ].join("\n\n");
  }
}

function toGroqMessages(
  messages: MusicChatMessage[],
  presetQuestionId?: MusicChatPresetQuestionId
) {
  const selected = messages.slice(-MAX_HISTORY_MESSAGES);
  const prompt =
    presetQuestionId && selected.length === 0
      ? getPresetQuestion(presetQuestionId)
      : undefined;

  return [
    ...selected.map((message) => ({
      role: message.role,
      content: removeRawMetadataSentences(message.content),
    })),
    ...(prompt ? [{ role: "user", content: prompt }] : []),
  ];
}

function parseToolArguments(rawArgs: string | undefined): Record<string, unknown> {
  if (!rawArgs) return {};
  const parsed = JSON.parse(rawArgs);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

function removeRawMetadataSentences(content: string): string {
  return content
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .filter(
          (sentence) => !/(?:dataQuality|insufficientData)/i.test(sentence)
        )
        .join(" ")
        .trim()
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

function getFinalContent(response: Awaited<ReturnType<typeof createGroqChatCompletion>>) {
  const content = response.choices[0]?.message?.content?.trim() ?? "";
  return removeRawMetadataSentences(content);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function prepareToolResultForModel(result: unknown): unknown {
  if (!isRecord(result)) {
    return result;
  }

  const { dataQuality, ...rest } = result;
  if (
    isRecord(dataQuality) &&
    dataQuality.insufficientData === true
  ) {
    return {
      ...rest,
      cautions: [
        "One or both comparison periods have very little listening data, so describe the comparison as directional rather than definitive.",
      ],
    };
  }

  return rest;
}

/** Match a 4-digit calendar year in the user message (any locale). */
function extractCalendarYearFromMessages(
  messages: MusicChatMessage[]
): number | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const entry = messages[i];
    if (entry.role !== "user") continue;
    const match = /\b((?:19|20)\d{2})\b/.exec(entry.content);
    if (match) {
      const y = Number.parseInt(match[1], 10);
      if (Number.isFinite(y)) return y;
    }
  }
  return null;
}

function getDirectPresetToolCall(
  presetQuestionId: MusicChatPresetQuestionId | undefined,
  messages: MusicChatMessage[],
  presetArgs: MusicChatPresetArgs | undefined,
  dateRange: MusicChatDateRangeContext | undefined
): DirectPresetToolCall | null {
  if (presetQuestionId === "taste-shift-2020-2024") {
    return {
      id: "preset_taste_shift_2020_2024",
      toolName: "getTasteShiftSummary",
      args: {
        firstStartDate: "2020-01-01",
        firstEndDate: "2020-12-31",
        secondStartDate: "2024-01-01",
        secondEndDate: "2024-12-31",
        topLimit: 5,
        deltaLimit: 5,
      },
    };
  }

  if (presetQuestionId === "summer-2022-top-tracks") {
    const year = extractCalendarYearFromMessages(messages) ?? 2022;
    return {
      id: "preset_top_tracks_year",
      toolName: "getTopTracksForPeriod",
      args: {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        limit: 10,
      },
    };
  }

  if (presetQuestionId === "summer-2022-top-artists") {
    const year = extractCalendarYearFromMessages(messages) ?? 2022;
    return {
      id: "preset_top_artists_year",
      toolName: "getTopArtistsForPeriod",
      args: {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        limit: 10,
      },
    };
  }

  if (presetQuestionId === "track-obsessions-2022") {
    const year = extractCalendarYearFromMessages(messages) ?? 2022;
    return {
      id: "preset_track_obsessions_year",
      toolName: "getTrackObsessionWindows",
      args: {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        windowDays: 7,
        limit: 5,
        minListensInWindow: 2,
      },
    };
  }

  if (presetQuestionId === "compare-listening-periods") {
    const a = presetArgs?.earlierYear;
    const b = presetArgs?.laterYear;
    if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) {
      return null;
    }
    const earlier = Math.min(Math.trunc(a), Math.trunc(b));
    const later = Math.max(Math.trunc(a), Math.trunc(b));
    return {
      id: "preset_compare_listening_periods",
      toolName: "compareListeningPeriods",
      args: {
        firstStartDate: `${earlier}-01-01`,
        firstEndDate: `${earlier}-12-31`,
        secondStartDate: `${later}-01-01`,
        secondEndDate: `${later}-12-31`,
      },
    };
  }

  if (presetQuestionId === "genre-breakdown-last-year") {
    const y = resolveGenreQuickPresetYear(presetArgs, dateRange);
    return {
      id: "preset_genre_last_year",
      toolName: "getGenreBreakdownForPeriod",
      args: {
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`,
        limit: 10,
      },
    };
  }

  if (presetQuestionId === "yearly-listening-trends") {
    return {
      id: "preset_yearly_trends",
      toolName: "getListeningTrendsByYear",
      args: { limit: 20 },
    };
  }

  if (presetQuestionId === "consistent-artists") {
    return {
      id: "preset_consistent_artists",
      toolName: "getMostConsistentArtistsOverTime",
      args: { limit: 10 },
    };
  }

  if (presetQuestionId === "late-night-habits") {
    const { startDate, endDate } = getLateNightPresetDateRange();
    return {
      id: "preset_late_night_habits",
      toolName: "getLateNightListeningProfile",
      args: {
        limit: 10,
        startDate,
        endDate,
      },
    };
  }

  if (presetQuestionId === "artist-deep-dive") {
    const artistName = resolveArtistNameForDeepDivePreset(presetArgs, messages);
    return {
      id: "preset_artist_deep_dive",
      toolName: "getArtistDeepDive",
      args: { artistName, limit: 10 },
    };
  }

  return null;
}

async function createFinalAnswerFromToolResults(
  groqMessages: Array<Record<string, unknown>>
): Promise<string> {
  const finalResponse = await createGroqChatCompletion({
    model: GROQ_DEFAULT_MODEL,
    temperature: 0.2,
    max_tokens: MUSIC_CHAT_COMPLETION_MAX_TOKENS,
    messages: [
      ...groqMessages,
      {
        role: "user",
        content:
          "Now answer the user's original question using only the tool results above. Use short paragraphs separated by blank lines; use '- ' bullet lines for lists of items; one bullet per metric (no \" - \" chains on the same line). End with caveats as their own short paragraph. Keep the tone warm and readable.",
      },
    ] as unknown as ChatCompletionCreateParamsNonStreaming["messages"],
  });
  const answer = getFinalContent(finalResponse);
  if (!answer) {
    throw new Error("Empty response from music chat LLM.");
  }

  return answer;
}

export async function generateMusicChatAnswer({
  userId,
  messages,
  locale,
  presetQuestionId,
  presetArgs,
  dateRange,
}: {
  userId: string;
  messages: MusicChatMessage[];
  locale: AiLocale;
  presetQuestionId?: MusicChatPresetQuestionId;
  presetArgs?: MusicChatPresetArgs;
  dateRange?: MusicChatDateRangeContext;
}): Promise<MusicChatResponse> {
  const presetCacheSuffix =
    presetQuestionId !== undefined
      ? buildMusicChatPresetCacheSuffix(
          presetQuestionId,
          messages,
          presetArgs,
          dateRange
        )
      : null;
  const presetCacheStorageKey =
    presetQuestionId !== undefined && presetCacheSuffix !== null
      ? buildMusicChatPresetStorageKey(
          userId,
          presetQuestionId,
          locale,
          presetCacheSuffix,
          dateRange
        )
      : null;

  if (presetCacheStorageKey) {
    const cached = await getCachedMusicChatPresetResponse(presetCacheStorageKey);
    if (cached?.answer) {
      return cached;
    }
  }

  const sources: MusicChatToolResult[] = [];
  const groqMessages: Array<Record<string, unknown>> = [
    { role: "system", content: buildSystemPrompt(locale, dateRange) },
    ...toGroqMessages(messages, presetQuestionId),
  ];
  const directPresetToolCall = getDirectPresetToolCall(
    presetQuestionId,
    messages,
    presetArgs,
    dateRange
  );

  if (directPresetToolCall) {
    const result = await executeMusicChatTool(
      userId,
      directPresetToolCall.toolName,
      directPresetToolCall.args
    );
    sources.push({
      toolName: directPresetToolCall.toolName,
      args: directPresetToolCall.args,
      result,
    });
    groqMessages.push(
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: directPresetToolCall.id,
            type: "function",
            function: {
              name: directPresetToolCall.toolName,
              arguments: JSON.stringify(directPresetToolCall.args),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: directPresetToolCall.id,
        content: JSON.stringify(prepareToolResultForModel(result)),
      }
    );

    let answer: string;
    if (
      presetQuestionId === "summer-2022-top-tracks" &&
      directPresetToolCall.toolName === "getTopTracksForPeriod" &&
      isTopTracksPeriodToolResult(result)
    ) {
      answer = formatTopTracksPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "summer-2022-top-artists" &&
      directPresetToolCall.toolName === "getTopArtistsForPeriod" &&
      isTopArtistsPeriodToolResult(result)
    ) {
      answer = formatTopArtistsPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "artist-deep-dive" &&
      directPresetToolCall.toolName === "getArtistDeepDive" &&
      isArtistDeepDiveToolResult(result)
    ) {
      answer = formatArtistDeepDivePresetAnswer(locale, result);
    } else if (
      presetQuestionId === "genre-breakdown-last-year" &&
      directPresetToolCall.toolName === "getGenreBreakdownForPeriod" &&
      isGenreBreakdownToolResult(result)
    ) {
      answer = formatGenreBreakdownPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "compare-listening-periods" &&
      directPresetToolCall.toolName === "compareListeningPeriods" &&
      isComparePeriodsToolResult(result)
    ) {
      answer = formatComparePeriodsPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "yearly-listening-trends" &&
      directPresetToolCall.toolName === "getListeningTrendsByYear" &&
      isYearlyTrendsToolResult(result)
    ) {
      answer = formatYearlyTrendsPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "consistent-artists" &&
      directPresetToolCall.toolName === "getMostConsistentArtistsOverTime" &&
      isConsistentArtistsToolResult(result)
    ) {
      answer = formatConsistentArtistsPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "late-night-habits" &&
      directPresetToolCall.toolName === "getLateNightListeningProfile" &&
      isLateNightProfileToolResult(result)
    ) {
      answer = formatLateNightPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "taste-shift-2020-2024" &&
      directPresetToolCall.toolName === "getTasteShiftSummary" &&
      isTasteShiftSummaryToolResult(result)
    ) {
      answer = formatTasteShiftPresetAnswer(locale, result);
    } else if (
      presetQuestionId === "track-obsessions-2022" &&
      directPresetToolCall.toolName === "getTrackObsessionWindows" &&
      isTrackObsessionsToolResult(result)
    ) {
      answer = formatTrackObsessionsPresetAnswer(locale, result);
    } else {
      answer = await createFinalAnswerFromToolResults(groqMessages);
    }

    const directPresetResponse: MusicChatResponse = {
      answer,
      sources,
      locale,
      presetQuestionId,
    };

    if (presetCacheStorageKey && directPresetResponse.answer) {
      await setCachedMusicChatPresetResponse(
        presetCacheStorageKey,
        directPresetResponse,
        getMusicChatPresetCacheTtlSeconds()
      );
    }

    return directPresetResponse;
  }

  for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
    const params: ChatCompletionCreateParamsNonStreaming = {
      model: GROQ_DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: MUSIC_CHAT_COMPLETION_MAX_TOKENS,
      messages:
        groqMessages as unknown as ChatCompletionCreateParamsNonStreaming["messages"],
      tools:
        MUSIC_CHAT_TOOLS as unknown as ChatCompletionCreateParamsNonStreaming["tools"],
      tool_choice: "auto",
    };

    const response = await createGroqChatCompletion(params);
    const message = response.choices[0]?.message;
    const toolCalls = message?.tool_calls ?? [];

    if (toolCalls.length === 0) {
      if (step === 0 && sources.length === 0) {
        return {
          answer: getUnsupportedMusicChatAnswer(locale),
          sources,
          locale,
          presetQuestionId,
        };
      }

      const answer = getFinalContent(response);
      if (!answer) {
        throw new Error("Empty response from music chat LLM.");
      }
      return {
        answer,
        sources,
        locale,
        presetQuestionId,
      };
    }

    groqMessages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;
      const args = parseToolArguments(toolCall.function.arguments);
      const result = await executeMusicChatTool(userId, toolName, args);
      sources.push({
        toolName: toolName as MusicChatToolResult["toolName"],
        args,
        result,
      });
      groqMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(prepareToolResultForModel(result)),
      });
    }
  }

  return {
    answer: await createFinalAnswerFromToolResults(groqMessages),
    sources,
    locale,
    presetQuestionId,
  };
}
