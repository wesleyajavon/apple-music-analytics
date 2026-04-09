/**
 * POST /api/ai/taste-profile
 *
 * Generates a concise, human-readable music taste profile from aggregated analytics.
 * Accepts structured analytics summary only (no raw listening events).
 *
 * Caching: Responses cached by (analytics summary hash + tone).
 * Regeneration occurs only when inputs or tone change.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildTasteSummary } from "@/lib/services/ai/taste-summary-builder";
import { generateTasteProfile } from "@/lib/services/ai/taste-profile-service";
import {
  computeTasteProfileCacheKey,
  getCachedTasteProfile,
  setCachedTasteProfile,
} from "@/lib/services/ai/taste-profile-cache";
import { handleApiError } from "@/lib/utils/error-handler";
import { assertGroqUserQuotaForRequest } from "@/lib/services/ai/groq-user-quota";
import {
  AI_MASTER_DISABLED_COOKIE,
  isAiMasterEnvEnabled,
} from "@/lib/services/ai/ai-master";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import type {
  TasteProfileInput,
  TasteProfileResponse,
  TasteProfileTone,
} from "@/lib/dto/taste-profile";
import { assertRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const AI_TASTE_PROFILE_RATE_LIMIT = {
  route: "/api/ai/taste-profile",
  windowMs: 60_000,
  maxRequests: 8,
  softLimitRatio: 0.8,
} as const;

const TasteProfileToneSchema = z.enum(["analytical", "casual", "poetic"]);

const TasteProfileInputSchema = z.object({
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  genreDistribution: z.array(
    z.object({
      genre: z.string(),
      count: z.number().int().nonnegative(),
      percentage: z.number().nonnegative().max(100),
    })
  ),
  listeningByTimeOfDay: z.array(
    z.object({
      hour: z.number().int().min(0).max(23),
      listens: z.number().int().nonnegative(),
    })
  ),
  topArtists: z.array(
    z.object({
      artistName: z.string(),
      listenCount: z.number().int().nonnegative(),
      genre: z.string().optional(),
    })
  ),
  yearOverYearDeltas: z
    .array(
      z.object({
        metric: z.string(),
        currentValue: z.number(),
        previousValue: z.number(),
        percentChange: z.number(),
      })
    )
    .optional(),
  peakDay: z
    .object({
      dayName: z.string(),
      listens: z.number().int().nonnegative(),
    })
    .optional(),
  peakHour: z
    .object({
      hour: z.number().int().min(0).max(23),
      listens: z.number().int().nonnegative(),
    })
    .optional(),
  totalListens: z.number().int().nonnegative().optional(),
  uniqueArtists: z.number().int().nonnegative().optional(),
  uniqueTracks: z.number().int().nonnegative().optional(),
  tone: TasteProfileToneSchema.default("casual"),
  locale: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = TasteProfileInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          code: "VALIDATION_ERROR",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { tone, locale: localeParam, userId: bodyUserId, ...analyticsInput } =
      parseResult.data;
    await assertRateLimit(request, {
      ...AI_TASTE_PROFILE_RATE_LIMIT,
      userId: bodyUserId,
    });
    const input: TasteProfileInput = analyticsInput;
    const locale = parseAiLocale(localeParam);

    if (!isAiMasterEnvEnabled()) {
      const degraded: TasteProfileResponse = {
        description: "",
        influences: "",
        coreGenres: "",
        uniqueAspect: "",
        cached: false,
        aiUnavailable: true,
        aiUnavailableReason: "env",
      };
      return NextResponse.json(degraded);
    }
    if (request.cookies.get(AI_MASTER_DISABLED_COOKIE)?.value === "1") {
      const degraded: TasteProfileResponse = {
        description: "",
        influences: "",
        coreGenres: "",
        uniqueAspect: "",
        cached: false,
        aiUnavailable: true,
        aiUnavailableReason: "client",
      };
      return NextResponse.json(degraded);
    }

    // 1. Build deterministic taste summary
    const summary = buildTasteSummary(input);

    // 2. Compute cache key (summary hash + tone + locale)
    const cacheKey = computeTasteProfileCacheKey(summary, tone, locale);

    // 3. Check cache first
    const cached = await getCachedTasteProfile(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    await assertGroqUserQuotaForRequest(request, bodyUserId);

    // 4. Generate profile via LLM
    const profile = await generateTasteProfile(summary, tone, locale);

    // 5. Store in cache
    await setCachedTasteProfile(cacheKey, profile);

    return NextResponse.json({
      ...profile,
      cached: false,
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/taste-profile" });
  }
}
