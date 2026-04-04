import { NextRequest, NextResponse } from "next/server";
import { getGenreTrends, type GenreTrendPeriod } from "@/lib/services/listening/listening-stats";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type { GenreTrendsResponse } from "@/lib/dto/genres";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import { pivotTrends } from "@/lib/utils/genre-trends-pivot";

export const dynamic = "force-dynamic";

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
 *         description: Filter displayed genres (repeat parameter for multiple)
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
    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");

    let startDate: Date;
    let endDate: Date;

    if (!hasStartDate && !hasEndDate) {
      const userId = extractOptionalUserId(request);
      const range = await getListenDateRange(userId);
      if (!range) {
        return NextResponse.json({ data: [], availableGenres: [] });
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
    const period = extractPeriod(request, "month") as GenreTrendPeriod;
    const userId = extractOptionalUserId(request);
    const genresFilter = extractGenresFilter(request);
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    const rows = await getGenreTrends(startDate, endDate, period, userId);
    const { data, availableGenres } = pivotTrends(
      rows,
      period,
      locale,
      genresFilter
    );

    const response: GenreTrendsResponse = {
      data,
      availableGenres,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/genres/trends" });
  }
}
