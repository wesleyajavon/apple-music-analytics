/**
 * POST /api/ai/insights
 *
 * One-shot AI insight generator. Accepts aggregated analytics only (no raw events).
 * Returns 3-5 concise, data-grounded insight bullet points.
 *
 * Caching: Responses are cached by hash of analytics summary.
 * Regeneration occurs only when underlying analytics change.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { summarizeAnalytics } from "@/lib/services/ai/analytics-summarizer";
import { generateInsights } from "@/lib/services/ai/llm-service";
import {
  computeCacheKey,
  getCachedInsights,
  setCachedInsights,
} from "@/lib/services/ai/insights-cache";
import { handleApiError } from "@/lib/utils/error-handler";
import { assertGroqUserQuotaForRequest } from "@/lib/services/ai/groq-user-quota";
import {
  assertInteractiveGroqNotBlockedByImportGenreBackfill,
  resolveUserIdForGroqGenreBackfillGuard,
} from "@/lib/services/listening/groq-import-genre-backfill-ai-guard";
import {
  AI_MASTER_DISABLED_COOKIE,
  isAiMasterEnvEnabled,
} from "@/lib/services/ai/ai-master";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import type { AiInsightsInput, AiInsightsResponse } from "@/lib/dto/ai-insights";
import { assertRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const AI_INSIGHTS_RATE_LIMIT = {
  route: "/api/ai/insights",
  windowMs: 60_000,
  maxRequests: 8,
  softLimitRatio: 0.8,
} as const;

const AiInsightsInputSchema = z.object({
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
  insightStyle: z.enum(["human", "technical"]).optional().default("technical"),
  locale: z.string().optional(),
  /** Optionnel : rattache le quota Groq à un utilisateur (query `userId` prioritaire). */
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = AiInsightsInputSchema.safeParse(body);

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

    const {
      locale: localeParam,
      userId: bodyUserId,
      insightStyle,
      ...inputData
    } =
      parseResult.data;
    await assertRateLimit(request, {
      ...AI_INSIGHTS_RATE_LIMIT,
      userId: bodyUserId,
    });
    const input = inputData as AiInsightsInput;
    const locale = parseAiLocale(localeParam);

    if (!isAiMasterEnvEnabled()) {
      const degraded: AiInsightsResponse = {
        insights: [],
        cached: false,
        aiUnavailable: true,
        aiUnavailableReason: "env",
      };
      return NextResponse.json(degraded);
    }
    if (request.cookies.get(AI_MASTER_DISABLED_COOKIE)?.value === "1") {
      const degraded: AiInsightsResponse = {
        insights: [],
        cached: false,
        aiUnavailable: true,
        aiUnavailableReason: "client",
      };
      return NextResponse.json(degraded);
    }

    // 1. Summarize and normalize (deterministic, localized)
    const summary = summarizeAnalytics(input, locale);

    // 2. Compute cache key from summary hash + locale
    const cacheKey = computeCacheKey(summary, locale, insightStyle);

    // 3. Check cache first (cache logic separated from generation)
    const cached = await getCachedInsights(cacheKey);
    if (cached) {
      const response: AiInsightsResponse = {
        insights: cached,
        cached: true,
      };
      return NextResponse.json(response);
    }

    const guardUserId = await resolveUserIdForGroqGenreBackfillGuard(bodyUserId);
    if (guardUserId) {
      await assertInteractiveGroqNotBlockedByImportGenreBackfill(guardUserId);
    }

    await assertGroqUserQuotaForRequest(request, bodyUserId);

    // 4. Generate insights via LLM
    const insights = await generateInsights(summary, locale, insightStyle);

    // 5. Store in cache for future requests
    await setCachedInsights(cacheKey, insights);

    const response: AiInsightsResponse = {
      insights,
      cached: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/insights" });
  }
}
