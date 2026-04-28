import { NextRequest, NextResponse } from "next/server";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { getListeningHabitPrediction } from "@/lib/services/predictions/listening-habit-service";
import {
  getCachedExplanation,
  getCachedPrediction,
  getExplanationCacheKey,
  setCachedExplanation,
  setCachedPrediction,
} from "@/lib/services/predictions/prediction-cache";
import { explainListeningHabitPrediction } from "@/lib/services/ai/listening-habit-explainer";
import { isAiMasterEnabledForRequest } from "@/lib/services/ai/ai-master";
import type { ListeningHabitPrediction, ListeningHabitResponse } from "@/lib/dto/predictions";

export const dynamic = "force-dynamic";

const ROUTE_RATE_LIMIT = {
  route: "/api/predictions/listening-habit",
  windowMs: 60_000,
  maxRequests: 24,
  softLimitRatio: 0.8,
} as const;

function isInsufficientData(payload: ListeningHabitResponse): boolean {
  return "insufficientData" in payload && payload.insufficientData === true;
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403
        ? forbiddenResponse()
        : unauthorizedResponse();
    }
    const { userId } = resolved;

    await assertRateLimit(request, {
      ...ROUTE_RATE_LIMIT,
      userId,
    });

    const { searchParams } = new URL(request.url);
    const explain = searchParams.get("explain") === "true";
    const locale = searchParams.get("locale") ?? "fr";

    const cached = await getCachedPrediction(userId);
    if (
      cached !== null &&
      !isInsufficientData(cached) &&
      cached !== undefined
    ) {
      const payload = cached as ListeningHabitPrediction;

      let aiExplanation: string | undefined;

      if (explain && isAiMasterEnabledForRequest(request)) {
        const expLogicalKey = getExplanationCacheKey(userId, locale);
        let cachedExpl = await getCachedExplanation(expLogicalKey);

        if (cachedExpl === null) {
          const generated = await explainListeningHabitPrediction(
            payload,
            locale,
          ).catch(() => "");
          cachedExpl =
            typeof generated === "string" && generated.trim().length > 0
              ? generated.trim()
              : "";

          if (cachedExpl !== "") await setCachedExplanation(expLogicalKey, cachedExpl);
        }

        if (cachedExpl && cachedExpl.trim().length > 0) aiExplanation = cachedExpl;
      }

      const body: Record<string, unknown> = {
        ...payload,
        fromCache: true,
      };

      if (aiExplanation !== undefined) body.aiExplanation = aiExplanation;

      return NextResponse.json(body);
    }

    const result = await getListeningHabitPrediction(userId);

    if (isInsufficientData(result)) {
      return NextResponse.json({
        ...result,
        fromCache: false,
      });
    }

    const prediction = result as ListeningHabitPrediction;

    await setCachedPrediction(userId, prediction);

    let aiExplanation: string | undefined;

    if (explain && isAiMasterEnabledForRequest(request)) {
      const expLogicalKey = getExplanationCacheKey(userId, locale);
      let cachedExpl = await getCachedExplanation(expLogicalKey);

      if (cachedExpl === null) {
        const generated = await explainListeningHabitPrediction(
          prediction,
          locale,
        ).catch(() => "");
        cachedExpl =
          typeof generated === "string" && generated.trim().length > 0
            ? generated.trim()
            : "";

        if (cachedExpl !== "") await setCachedExplanation(expLogicalKey, cachedExpl);
      }

      if (cachedExpl && cachedExpl.trim().length > 0) aiExplanation = cachedExpl;
    }

    const body: Record<string, unknown> = {
      ...prediction,
      fromCache: false,
    };
    if (aiExplanation !== undefined) body.aiExplanation = aiExplanation;

    return NextResponse.json(body);
  } catch (error) {
    return handleApiError(error, { route: "/api/predictions/listening-habit" });
  }
}