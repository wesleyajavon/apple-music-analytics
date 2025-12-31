import { NextRequest, NextResponse } from "next/server";
import { getListens, getAggregatedListens } from "@/lib/services/listening";
import { ListensResponse, AggregatedListensResponse } from "@/lib/dto/listening";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";

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

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const source = searchParams.get("source") as
      | "lastfm"
      | "apple_music_replay"
      | null;
    const aggregate =
      searchParams.get("aggregate") ||
      searchParams.get("period") ||
      null;

    // If aggregate is requested, return aggregated data
    if (aggregate && ["day", "week", "month"].includes(aggregate)) {
      if (!startDate || !endDate) {
        throw createValidationError(
          "startDate and endDate are required when using aggregate parameter"
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw createValidationError(
          "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)",
          { startDate, endDate }
        );
      }

      const aggregatedData = await getAggregatedListens(
        start,
        end,
        aggregate as "day" | "week" | "month",
        userId
      );

      const response: AggregatedListensResponse = {
        data: aggregatedData,
        period: aggregate as "day" | "week" | "month",
        startDate: startDate,
        endDate: endDate,
      };

      return NextResponse.json(response);
    }

    // Otherwise, return raw listens
    const { data, total } = await getListens({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId,
      limit,
      offset,
      source: source || undefined,
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

