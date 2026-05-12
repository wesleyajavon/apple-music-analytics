import { NextRequest, NextResponse } from "next/server";
import { getListens } from "@/lib/services/listening/listening-service";
import { getAggregatedListens } from "@/lib/services/listening/listening-aggregation";
import { ListensResponse, AggregatedListensResponse } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractRequiredDateRange,
  extractOptionalInteger,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { isListenRecordSource } from "@/lib/constants/listen-source";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";
const LISTENS_RATE_LIMIT = {
  route: "/api/listens",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

/**
 * @swagger
 * /api/listens:
 *   get:
 *     summary: Gets listens or aggregated data
 *     description: |
 *       Retrieves the list of listens with pagination, or aggregated data if aggregate/period parameter is provided.
 *       Two modes:
 *       - Without aggregate: Returns individual listens with pagination
 *       - With aggregate: Returns data aggregated by period
 *     tags:
 *       - Listens
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format (optional, required if aggregate is provided)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format (optional, required if aggregate is provided)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 100
 *         description: Number of results (list mode only)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Pagination offset (list mode only)
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [lastfm, apple_music_replay, spotify_export, spotify_web_api, apple_music_export]
 *         description: Listen source (list mode only)
 *       - in: query
 *         name: aggregate
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Aggregation period (alias: period)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Alias for aggregate
 *     responses:
 *       200:
 *         description: List of listens or aggregated data
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ListenDto'
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           uniqueTracks:
 *                             type: integer
 *                           uniqueArtists:
 *                             type: integer
 *                     period:
 *                       type: string
 *                       enum: [day, week, month]
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertRateLimit(request, {
      ...LISTENS_RATE_LIMIT,
      userId,
    });

    const { searchParams } = new URL(request.url);
    const aggregate =
      searchParams.get("aggregate") ||
      searchParams.get("period") ||
      null;

    // If aggregate is requested, return aggregated data
    if (aggregate && ["day", "week", "month"].includes(aggregate)) {
      const { startDate, endDate } = extractRequiredDateRange(request);

      const aggregatedData = await getAggregatedListens(
        startDate,
        endDate,
        aggregate as "day" | "week" | "month",
        userId
      );

      const response: AggregatedListensResponse = {
        data: aggregatedData,
        period: aggregate as "day" | "week" | "month",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };

      return NextResponse.json(response);
    }

    // Otherwise, return raw listens
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const limit = extractOptionalInteger(request, "limit", {
      min: 1,
      errorMessage: "Invalid limit. Must be a positive integer",
    }) || 100;
    const offset = extractOptionalInteger(request, "offset", {
      min: 0,
      errorMessage: "Invalid offset. Must be a non-negative integer",
    }) || 0;
    const sourceRaw = extractOptionalString(request, "source");
    const source =
      sourceRaw && isListenRecordSource(sourceRaw) ? sourceRaw : undefined;

    // Convert dates to ISO strings for getListens
    const startDate = startDateObj?.toISOString().split("T")[0];
    const endDate = endDateObj?.toISOString().split("T")[0];

    const { data, total } = await getListens({
      startDate,
      endDate,
      userId,
      limit,
      offset,
      source,
    });

    const response: ListensResponse = {
      data,
      total,
      limit,
      offset,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/listens' });
  }
}

