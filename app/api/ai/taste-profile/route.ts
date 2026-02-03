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
import type { TasteProfileInput, TasteProfileTone } from "@/lib/dto/taste-profile";

export const dynamic = "force-dynamic";

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

    const { tone, ...analyticsInput } = parseResult.data;
    const input: TasteProfileInput = analyticsInput;

    // 1. Build deterministic taste summary
    const summary = buildTasteSummary(input);

    // 2. Compute cache key (summary hash + tone)
    const cacheKey = computeTasteProfileCacheKey(summary, tone);

    // 3. Check cache first
    const cached = await getCachedTasteProfile(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // 4. Generate profile via LLM
    const profile = await generateTasteProfile(summary, tone);

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
