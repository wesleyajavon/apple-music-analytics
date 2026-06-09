import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import { assertGroqUserQuotaForRequest } from "@/lib/services/ai/groq-user-quota";
import { getGroqAiUnavailableReason } from "@/lib/services/ai/groq-ai-request-guard";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import { generateMusicChatAnswer } from "@/lib/services/ai/music-chat-service";
import {
  assertInteractiveGroqNotBlockedByImportGenreBackfill,
} from "@/lib/services/listening/groq-import-genre-backfill-ai-guard";
import {
  getPresetQuestion,
  isMusicChatPresetQuestionId,
} from "@/lib/services/ai/music-chat-tools";
import type {
  MusicChatDateRangeContext,
  MusicChatMessage,
  MusicChatResponse,
} from "@/lib/dto/music-chat";

export const dynamic = "force-dynamic";
/** Hobby/Pro ceilings vary; keep client `timeout` in use-music-chat aligned with this value */
export const maxDuration = 180;

const MUSIC_CHAT_RATE_LIMIT = {
  route: "/api/ai/music-chat",
  windowMs: 60_000,
  maxRequests: 8,
  softLimitRatio: 0.8,
} as const;

const MusicChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const MusicChatPresetArgsSchema = z
  .object({
    artistName: z.string().max(200).optional(),
    earlierYear: z.number().int().min(1900).max(2100).optional(),
    laterYear: z.number().int().min(1900).max(2100).optional(),
    genreYear: z.number().int().min(1900).max(2100).optional(),
  })
  .strict();

const MusicChatInputSchema = z.object({
  messages: z.array(MusicChatMessageSchema).max(12).default([]),
  locale: z.string().optional(),
  presetQuestionId: z.string().optional(),
  presetArgs: MusicChatPresetArgsSchema.optional(),
  dateRange: z
    .object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      isAll: z.boolean().optional(),
    })
    .optional(),
});

function validationError(details: unknown) {
  return NextResponse.json(
    {
      error: "Invalid input",
      code: "VALIDATION_ERROR",
      details,
    },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = MusicChatInputSchema.safeParse(body);

    if (!parseResult.success) {
      return validationError(parseResult.error.flatten());
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get("userId");
    const {
      messages,
      locale: localeParam,
      presetQuestionId: rawPresetId,
      presetArgs: rawPresetArgs,
      dateRange,
    } =
      parseResult.data;
    const presetQuestionId = isMusicChatPresetQuestionId(rawPresetId)
      ? rawPresetId
      : undefined;

    const presetArgs = rawPresetArgs
      ? {
          artistName: rawPresetArgs.artistName?.trim() || undefined,
          earlierYear: rawPresetArgs.earlierYear,
          laterYear: rawPresetArgs.laterYear,
          genreYear: rawPresetArgs.genreYear,
        }
      : undefined;

    if (rawPresetId && !presetQuestionId) {
      return validationError({ presetQuestionId: ["Unknown preset question."] });
    }

    const sessionUserId = (await getCurrentUserId(request)) ?? null;
    const isAnonymousPresetRequest = !sessionUserId && !!queryUserId;
    if (isAnonymousPresetRequest && !presetQuestionId) {
      return NextResponse.json(
        {
          error: "Public demo chat only supports preset questions.",
          code: "PUBLIC_DEMO_PRESET_REQUIRED",
        },
        { status: 403 }
      );
    }

    if (!sessionUserId && !presetQuestionId) {
      return unauthorizedResponse();
    }

    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;

    const effectiveMessages: MusicChatMessage[] =
      messages.length > 0
        ? messages
        : presetQuestionId
          ? [{ role: "user", content: getPresetQuestion(presetQuestionId) }]
          : [];

    if (effectiveMessages.length === 0) {
      return validationError({ messages: ["At least one message is required."] });
    }

    await assertAnalyticsRateLimit(request, MUSIC_CHAT_RATE_LIMIT, userId);

    const locale = parseAiLocale(localeParam);

    const aiUnavailableReason = await getGroqAiUnavailableReason(request, userId);
    if (aiUnavailableReason) {
      const degraded: MusicChatResponse = {
        answer: "",
        sources: [],
        locale,
        presetQuestionId,
        aiUnavailable: true,
        aiUnavailableReason,
      };
      return NextResponse.json(degraded);
    }

    await assertInteractiveGroqNotBlockedByImportGenreBackfill(userId);

    await assertGroqUserQuotaForRequest(request, userId);

    const response = await generateMusicChatAnswer({
      userId,
      messages: effectiveMessages,
      locale,
      presetQuestionId,
      presetArgs,
      dateRange: dateRange as MusicChatDateRangeContext | undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/music-chat" });
  }
}
