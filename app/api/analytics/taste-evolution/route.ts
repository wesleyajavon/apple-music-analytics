/**
 * GET /api/analytics/taste-evolution
 *
 * Week-to-week taste evolution analysis.
 * Server derives weekly aggregates from stored listening history.
 * No raw listening events from client.
 *
 * Query params: startDate, endDate, userId (optional)
 * Returns: structured trends + optional AI commentary
 */

import { NextRequest, NextResponse } from "next/server";
import {
  extractDateRangeWithDefaults,
  extractOptionalUserId,
} from "@/lib/middleware/validation";
import { getTasteEvolutionTrends } from "@/lib/services/taste-evolution/taste-evolution-service";
import { generateTasteEvolutionCommentary } from "@/lib/services/ai/taste-evolution-commentary";
import {
  getCachedTrends,
  setCachedTrends,
  getCachedCommentary,
  setCachedCommentary,
} from "@/lib/services/taste-evolution/taste-evolution-cache";
import { handleApiError } from "@/lib/utils/error-handler";
import type { TasteEvolutionResponse } from "@/lib/dto/taste-evolution";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 56); // 8 weeks default

    const { startDate, endDate } = extractDateRangeWithDefaults(
      request,
      defaultStartDate,
      defaultEndDate
    );
    const userId = extractOptionalUserId(request);

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    // 1. Check trends cache
    let trends: TasteEvolutionResponse["trends"];
    let skippedWeeks: TasteEvolutionResponse["skippedWeeks"];
    const cachedTrends = await getCachedTrends(startStr, endStr, userId);

    if (cachedTrends) {
      trends = cachedTrends.trends;
      skippedWeeks = cachedTrends.skippedWeeks;
    } else {
      const result = await getTasteEvolutionTrends(startDate, endDate, userId);
      trends = result.trends;
      skippedWeeks = result.skippedWeeks;
      await setCachedTrends(startStr, endStr, userId, {
        trends,
        skippedWeeks,
      });
    }

    // 2. AI commentary (optional, cached separately)
    let commentary: string | null = null;
    let commentaryCached = false;

    if (trends.length > 0) {
      const cachedCommentary = await getCachedCommentary(trends);
      if (cachedCommentary) {
        commentary = cachedCommentary;
        commentaryCached = true;
      } else {
        try {
          commentary = await generateTasteEvolutionCommentary(trends);
          if (commentary) {
            await setCachedCommentary(trends, commentary);
          }
        } catch (err) {
          // AI failure should not break the response; commentary stays null
          console.warn("Taste evolution commentary generation failed:", err);
        }
      }
    }

    const response: TasteEvolutionResponse = {
      trends,
      commentary,
      commentaryCached: commentary ? commentaryCached : undefined,
      skippedWeeks,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/analytics/taste-evolution" });
  }
}
