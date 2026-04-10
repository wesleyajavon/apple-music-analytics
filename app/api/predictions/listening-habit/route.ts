/**
 * GET /api/predictions/listening-habit
 *
 * "When Will I Listen?" - Predicts the user's most likely listening time and genre for today.
 * Prediction is based on deterministic statistical heuristics (no ML).
 * Optional AI explanation: ?explain=true
 */

import { NextRequest, NextResponse } from "next/server";
import { getListeningHabitPrediction } from "@/lib/services/predictions/listening-habit-service";
import {
  getCachedPrediction,
  setCachedPrediction,
  getCachedExplanation,
  setCachedExplanation,
  getExplanationCacheKey,
} from "@/lib/services/predictions/prediction-cache";
import { explainListeningHabitPrediction } from "@/lib/services/ai/listening-habit-explainer";
import {
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import type { ListeningHabitPrediction } from "@/lib/dto/predictions";
import { handleApiError } from "@/lib/utils/error-handler";
import { isAiMasterEnabledForRequest } from "@/lib/services/ai/ai-master";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const PREDICTION_LISTENING_HABIT_RATE_LIMIT = {
  route: "/api/predictions/listening-habit",
  windowMs: 60_000,
  maxRequests: 8,
  softLimitRatio: 0.8,
} as const;

/**
 * @swagger
 * /api/predictions/listening-habit:
 *   get:
 *     summary: "When Will I Listen?" prediction
 *     description: |
 *       Predicts the most likely time window and genre for today based on historical listening habits.
 *       Uses deterministic logic (no ML). Use ?explain=true for natural language explanation (AI).
 *     tags:
 *       - Predictions
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *       - in: query
 *         name: explain
 *         schema:
 *           type: boolean
 *         description: Include AI explanation (optional)
 *     responses:
 *       200:
 *         description: Prediction or insufficient data
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertRateLimit(request, {
      ...PREDICTION_LISTENING_HABIT_RATE_LIMIT,
      userId,
    });
    const { searchParams } = new URL(request.url);
    const explainRequested = searchParams.get("explain") === "true";
    const aiMasterOn = isAiMasterEnabledForRequest(request);
    const includeExplanation = explainRequested && aiMasterOn;
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    // Try cache first (only for successful predictions)
    const cached = await getCachedPrediction(userId);
    if (cached) {
      const response: Record<string, unknown> = {
        ...cached,
        fromCache: true,
      };

      if (includeExplanation && "timeWindow" in cached) {
        const explanationKey = getExplanationCacheKey(cached, locale, userId);
        let explanation = await getCachedExplanation(explanationKey);
        if (!explanation) {
          try {
            explanation = await explainListeningHabitPrediction(cached, locale);
            await setCachedExplanation(explanationKey, explanation);
          } catch {
            // AI explanation failed - still return prediction without it
          }
        }
        if (explanation) {
          response.aiExplanation = explanation;
        }
      }

      if (explainRequested && !aiMasterOn) {
        response.aiUnavailable = true;
      }

      return NextResponse.json(response);
    }

    // Compute prediction
    const result = await getListeningHabitPrediction(userId);

    // If insufficient data, return immediately (no cache)
    if ("insufficientData" in result && result.insufficientData) {
      return NextResponse.json(result);
    }

    // Cache successful prediction (result is ListeningHabitPrediction here)
    const prediction = result as ListeningHabitPrediction;
    await setCachedPrediction(prediction, userId);

    const response: Record<string, unknown> = {
      ...prediction,
      fromCache: false,
    };

    if (includeExplanation) {
      const explanationKey = getExplanationCacheKey(prediction, locale, userId);
      let explanation = await getCachedExplanation(explanationKey);
      if (!explanation) {
        try {
          explanation = await explainListeningHabitPrediction(prediction, locale);
          await setCachedExplanation(explanationKey, explanation);
        } catch {
          // AI explanation failed
        }
      }
      if (explanation) {
        response.aiExplanation = explanation;
      }
    }

    if (explainRequested && !aiMasterOn) {
      response.aiUnavailable = true;
    }

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/predictions/listening-habit" });
  }
}
