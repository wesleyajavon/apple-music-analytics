import { NextRequest, NextResponse } from "next/server";
import { getGenreTrends, type GenreTrendPeriod } from "@/lib/services/listening/listening-stats";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type { GenreTrendsCommentaryApiResponse } from "@/lib/dto/genre-trends-ai";
import { AppError, handleApiError } from "@/lib/utils/error-handler";
import { assertGroqUserQuotaForRequest } from "@/lib/services/ai/groq-user-quota";
import { isAiMasterEnabledForRequest } from "@/lib/services/ai/ai-master";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale, type AiLocale } from "@/lib/services/ai/locale-utils";
import { pivotTrends } from "@/lib/utils/genre-trends-pivot";
import {
  buildGenreTrendsCompactPayload,
  generateGenreTrendsCommentary,
} from "@/lib/services/ai/genre-trends-commentary";
import {
  getCachedGenreTrendsCommentary,
  setCachedGenreTrendsCommentary,
} from "@/lib/services/ai/genre-trends-commentary-cache";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import {
  applyRateLimitHeaders,
  assertRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const AI_GENRE_TRENDS_RATE_LIMIT = {
  route: "/api/ai/genre-trends-commentary",
  windowMs: 60_000,
  maxRequests: 12,
} as const;

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function extractGenres(request: NextRequest): string[] {
  const values = new URL(request.url).searchParams.getAll("genres").filter(Boolean);
  return [...new Set(values)].sort();
}

/** Default `both` keeps one round-trip returning tech + light (legacy). */
function extractCommentaryMode(request: NextRequest): "both" | "technical" | "light" {
  const raw = request.nextUrl.searchParams.get("mode");
  if (raw === "technical" || raw === "light") return raw;
  return "both";
}

export async function GET(request: NextRequest) {
  let rateLimit: RateLimitResult | undefined;
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    rateLimit = await assertRateLimit(request, {
      ...AI_GENRE_TRENDS_RATE_LIMIT,
      userId,
    });

    const genres = extractGenres(request);
    if (genres.length === 0) {
      const response = NextResponse.json(
        { error: "At least one `genres` query parameter is required.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
      return applyRateLimitHeaders(response, rateLimit, AI_GENRE_TRENDS_RATE_LIMIT);
    }

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");

    let startDate: Date;
    let endDate: Date;
    let timeFilterMode: "all_time" | "custom_range";

    if (!hasStartDate && !hasEndDate) {
      const range = await getListenDateRange(userId);
      if (!range) {
        const empty: GenreTrendsCommentaryApiResponse = {
          commentary: null,
          commentaryLight: null,
        };
        const response = NextResponse.json(empty);
        return applyRateLimitHeaders(response, rateLimit, AI_GENRE_TRENDS_RATE_LIMIT);
      }
      startDate = range.minDate;
      endDate = range.maxDate;
      timeFilterMode = "all_time";
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate);
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const extracted = extractDateRangeWithDefaults(
        request,
        defaultStartDate,
        defaultEndDate
      );
      startDate = extracted.startDate;
      endDate = extracted.endDate;
      timeFilterMode = "custom_range";
    }

    const period = extractPeriod(request, "month") as GenreTrendPeriod;
    const locale = parseAiLocale(extractOptionalString(request, "locale")) as AiLocale;
    const commentaryMode = extractCommentaryMode(request);

    const rows = await getGenreTrends(startDate, endDate, period, userId);
    const { data: chartData } = pivotTrends(rows, period, locale, genres);

    const payload = buildGenreTrendsCompactPayload(
      chartData,
      genres,
      period,
      { start: toIsoDate(startDate), end: toIsoDate(endDate) },
      timeFilterMode
    );

    if (!payload) {
      const empty: GenreTrendsCommentaryApiResponse = {
        commentary: null,
        commentaryLight: null,
      };
      const response = NextResponse.json(empty);
      return applyRateLimitHeaders(response, rateLimit, AI_GENRE_TRENDS_RATE_LIMIT);
    }

    if (!isAiMasterEnabledForRequest(request)) {
      const res: GenreTrendsCommentaryApiResponse = {
        commentary: null,
        commentaryLight: null,
        aiUnavailable: true,
      };
      const response = NextResponse.json(res);
      return applyRateLimitHeaders(response, rateLimit, AI_GENRE_TRENDS_RATE_LIMIT);
    }

    if (!process.env.GROQ_API_KEY) {
      const res: GenreTrendsCommentaryApiResponse = {
        commentary: null,
        commentaryLight: null,
        aiUnavailable: true,
      };
      const response = NextResponse.json(res);
      return applyRateLimitHeaders(response, rateLimit, AI_GENRE_TRENDS_RATE_LIMIT);
    }

    let commentary: string | null = null;
    let commentaryLight: string | null = null;
    let commentaryCached = false;
    let commentaryLightCached = false;

    const wantTech = commentaryMode === "both" || commentaryMode === "technical";
    const wantLight = commentaryMode === "both" || commentaryMode === "light";

    if (wantTech) {
      const cachedTech = await getCachedGenreTrendsCommentary(payload, locale, false);
      if (cachedTech) {
        commentary = cachedTech;
        commentaryCached = true;
      } else {
        try {
          await assertGroqUserQuotaForRequest(request, userId);
          commentary = await generateGenreTrendsCommentary(payload, locale, false);
          if (commentary) {
            await setCachedGenreTrendsCommentary(payload, commentary, locale, false);
          }
        } catch (err) {
          if (err instanceof AppError && err.statusCode === 429) throw err;
          console.warn("Genre trends AI commentary (technical) failed:", err);
        }
      }
    }

    if (wantLight) {
      const cachedLight = await getCachedGenreTrendsCommentary(payload, locale, true);
      if (cachedLight) {
        commentaryLight = cachedLight;
        commentaryLightCached = true;
      } else {
        try {
          await assertGroqUserQuotaForRequest(request, userId);
          commentaryLight = await generateGenreTrendsCommentary(payload, locale, true);
          if (commentaryLight) {
            await setCachedGenreTrendsCommentary(payload, commentaryLight, locale, true);
          }
        } catch (err) {
          if (err instanceof AppError && err.statusCode === 429) throw err;
          console.warn("Genre trends AI commentary (light) failed:", err);
        }
      }
    }

    const response: GenreTrendsCommentaryApiResponse = {
      commentary,
      commentaryLight,
      commentaryCached: commentary ? commentaryCached : undefined,
      commentaryLightCached: commentaryLight ? commentaryLightCached : undefined,
    };

    return applyRateLimitHeaders(
      NextResponse.json(response),
      rateLimit,
      AI_GENRE_TRENDS_RATE_LIMIT
    );
  } catch (error) {
    const response = handleApiError(error, { route: "/api/ai/genre-trends-commentary" });
    if (rateLimit) {
      return applyRateLimitHeaders(response, rateLimit, AI_GENRE_TRENDS_RATE_LIMIT);
    }
    return response;
  }
}
