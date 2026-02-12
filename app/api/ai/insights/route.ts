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
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import type { AiInsightsInput, AiInsightsResponse } from "@/lib/dto/ai-insights";

export const dynamic = "force-dynamic";

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
  locale: z.string().optional(),
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

    const { locale: localeParam, ...inputData } = parseResult.data;
    const input = inputData as AiInsightsInput;
    const locale = parseAiLocale(localeParam);

    // 1. Summarize and normalize (deterministic, localized)
    const summary = summarizeAnalytics(input, locale);

    // 2. Compute cache key from summary hash + locale
    const cacheKey = computeCacheKey(summary, locale);

    // 3. Check cache first (cache logic separated from generation)
    const cached = await getCachedInsights(cacheKey);
    if (cached) {
      const response: AiInsightsResponse = {
        insights: cached,
        cached: true,
      };
      return NextResponse.json(response);
    }

    // 4. Generate insights via LLM
    const insights = await generateInsights(summary, locale);

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
