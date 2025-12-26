import { NextRequest, NextResponse } from "next/server";
import { getListens, getAggregatedListens } from "@/lib/services/listening";
import { ListensResponse, AggregatedListensResponse } from "@/lib/dto/listening";

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
        return NextResponse.json(
          {
            error:
              "startDate and endDate are required when using aggregate parameter",
          },
          { status: 400 }
        );
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" },
          { status: 400 }
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
    console.error("Error fetching listens:", error);
    return NextResponse.json(
      { error: "Failed to fetch listens data" },
      { status: 500 }
    );
  }
}

