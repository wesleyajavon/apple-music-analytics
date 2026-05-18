import { NextRequest } from "next/server";
import { getGenreTrends, type GenreTrendPeriod } from "@/lib/services/listening/listening-stats";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type { GenreTrendsResponse } from "@/lib/dto/genres";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import { buildGenreTrendsResponse } from "@/lib/utils/genre-trends-pivot";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import {
  getPublicProfileGenreTrendsAllTimeCached,
  getPublicProfileGenreTrendsRangeCached,
} from "@/lib/services/listening/public-genres-trends-cached";

export const dynamic = "force-dynamic";
const GENRES_TRENDS_RATE_LIMIT = {
  route: "/api/genres/trends",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

function extractGenresFilter(request: NextRequest): string[] | undefined {
  const { searchParams } = new URL(request.url);
  const values = searchParams.getAll("genres").filter(Boolean);
  return values.length > 0 ? values : undefined;
}

/**
 * @swagger
 * /api/genres/trends:
 *   get:
 *     summary: Genre trends over time
 *     description: Listening evolution by genre (day/week/month). Pivoted data for multi-line charts.
 *     tags:
 *       - Genres
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [day, week, month], default: month }
 *       - in: query
 *         name: genres
 *         schema: { type: array, items: { type: string } }
 *         description: Limit chart series to these genres; `availableGenres` still lists the full catalog for the range (repeat parameter for multiple)
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Genre trend data
 *       400:
 *         description: Validation error
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
    await assertAnalyticsRateLimit(request, GENRES_TRENDS_RATE_LIMIT, userId);

    const publicProfileId = getPublicProfileUserId();
    const isPublicDemoDataset =
      publicProfileId !== null && userId === publicProfileId;

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");
    const period = extractPeriod(request, "month") as GenreTrendPeriod;
    const genresFilter = extractGenresFilter(request);
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    if (isPublicDemoDataset && !hasStartDate && !hasEndDate) {
      const response = await getPublicProfileGenreTrendsAllTimeCached(
        userId,
        period,
        locale,
        genresFilter
      );
      return publicDemoJsonResponse(response, true);
    }

    let startDate: Date;
    let endDate: Date;

    if (!hasStartDate && !hasEndDate) {
      const range = await getListenDateRange(userId);
      if (!range) {
        return publicDemoJsonResponse(
          { data: [], availableGenres: [] },
          isPublicDemoDataset
        );
      }
      startDate = range.minDate;
      endDate = range.maxDate;
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
    }

    let response: GenreTrendsResponse;
    if (isPublicDemoDataset) {
      response = await getPublicProfileGenreTrendsRangeCached(
        userId,
        startDate,
        endDate,
        period,
        locale,
        genresFilter
      );
    } else {
      const rows = await getGenreTrends(
        startDate,
        endDate,
        period,
        userId
      );
      response = buildGenreTrendsResponse(rows, period, locale, genresFilter);
    }

    return publicDemoJsonResponse(response, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: "/api/genres/trends" });
  }
}
