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
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { getTasteEvolutionTrends } from "@/lib/services/taste-evolution/taste-evolution-service";
import { generateTasteEvolutionCommentary } from "@/lib/services/ai/taste-evolution-commentary";
import {
  getCachedTrends,
  setCachedTrends,
  getCachedCommentary,
  setCachedCommentary,
} from "@/lib/services/taste-evolution/taste-evolution-cache";
import { handleApiError } from "@/lib/utils/error-handler";
import { isAiMasterEnabledForRequest } from "@/lib/services/ai/ai-master";
import type { TasteEvolutionResponse } from "@/lib/dto/taste-evolution";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");

    let startDate: Date;
    let endDate: Date;

    if (!hasStartDate && !hasEndDate) {
      const range = await getListenDateRange(userId);
      if (!range) {
        return NextResponse.json({
          trends: [],
          commentary: null,
          commentaryLight: null,
          skippedWeeks: [],
        });
      }
      startDate = range.minDate;
      endDate = range.maxDate;
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate);
      defaultStartDate.setDate(defaultStartDate.getDate() - 56); // 8 weeks default
      const extracted = extractDateRangeWithDefaults(
        request,
        defaultStartDate,
        defaultEndDate
      );
      startDate = extracted.startDate;
      endDate = extracted.endDate;
    }
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    // 1. Check trends cache
    let trends: TasteEvolutionResponse["trends"];
    let skippedWeeks: TasteEvolutionResponse["skippedWeeks"];
    const cachedTrends = await getCachedTrends(startStr, endStr, userId, locale);

    if (cachedTrends) {
      trends = cachedTrends.trends;
      skippedWeeks = cachedTrends.skippedWeeks;
    } else {
      const result = await getTasteEvolutionTrends(
        startDate,
        endDate,
        userId,
        locale
      );
      trends = result.trends;
      skippedWeeks = result.skippedWeeks;
      await setCachedTrends(startStr, endStr, userId, locale, {
        trends,
        skippedWeeks,
      });
    }

    // 2. AI commentary (optional, cached separately) — technical + light versions
    let commentary: string | null = null;
    let commentaryLight: string | null = null;
    let commentaryCached = false;
    let aiUnavailable = false;

    const aiOn = isAiMasterEnabledForRequest(request);

    if (trends.length > 0 && aiOn) {
      // Technical version
      const cachedCommentary = await getCachedCommentary(trends, locale, false);
      if (cachedCommentary) {
        commentary = cachedCommentary;
        commentaryCached = true;
      } else {
        try {
          commentary = await generateTasteEvolutionCommentary(trends, locale, false);
          if (commentary) {
            await setCachedCommentary(trends, commentary, locale, false);
          }
        } catch (err) {
          console.warn("Taste evolution commentary generation failed:", err);
        }
      }

      // Light version (easy to read, no percentages)
      const cachedCommentaryLight = await getCachedCommentary(trends, locale, true);
      if (cachedCommentaryLight) {
        commentaryLight = cachedCommentaryLight;
      } else {
        try {
          commentaryLight = await generateTasteEvolutionCommentary(trends, locale, true);
          if (commentaryLight) {
            await setCachedCommentary(trends, commentaryLight, locale, true);
          }
        } catch (err) {
          console.warn("Taste evolution light commentary generation failed:", err);
        }
      }
    } else if (trends.length > 0 && !aiOn) {
      aiUnavailable = true;
    }

    const response: TasteEvolutionResponse = {
      trends,
      commentary,
      commentaryLight,
      commentaryCached: commentary ? commentaryCached : undefined,
      skippedWeeks,
      ...(aiUnavailable ? { aiUnavailable: true } : {}),
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/analytics/taste-evolution" });
  }
}
