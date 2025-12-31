import { NextRequest, NextResponse } from "next/server";
import { getListens, getAggregatedListens } from "@/lib/services/listening";
import { ListensResponse, AggregatedListensResponse } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractRequiredDateRange,
  extractOptionalUserId,
  extractOptionalInteger,
  extractOptionalString,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * GET /api/listens
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - userId: User ID (optional)
 * - limit: Number of results (default: 100)
 * - offset: Pagination offset (default: 0)
 * - source: 'lastfm' | 'apple_music_replay' (optional)
 * - aggregate: 'day' | 'week' | 'month' (optional) - If provided, returns aggregated data
 * - period: 'day' | 'week' | 'month' (optional) - Alias for aggregate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const aggregate =
      searchParams.get("aggregate") ||
      searchParams.get("period") ||
      null;

    // If aggregate is requested, return aggregated data
    if (aggregate && ["day", "week", "month"].includes(aggregate)) {
      const { startDate, endDate } = extractRequiredDateRange(request);
      const userId = extractOptionalUserId(request);

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
    const userId = extractOptionalUserId(request);
    const limit = extractOptionalInteger(request, "limit", {
      min: 1,
      errorMessage: "Invalid limit. Must be a positive integer",
    }) || 100;
    const offset = extractOptionalInteger(request, "offset", {
      min: 0,
      errorMessage: "Invalid offset. Must be a non-negative integer",
    }) || 0;
    const source = extractOptionalString(request, "source") as
      | "lastfm"
      | "apple_music_replay"
      | undefined;

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

