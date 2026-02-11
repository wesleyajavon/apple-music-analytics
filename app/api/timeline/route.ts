import { NextRequest, NextResponse } from "next/server";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening/listening-aggregation";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/timeline:
 *   get:
 *     summary: Gets listening timeline data
 *     description: Returns aggregated data by day/week/month, optimized for charts
 *     tags:
 *       - Timeline
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format (optional, default: 30 days ago)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format (optional, default: today)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Aggregation period (day, week or month)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *     responses:
 *       200:
 *         description: Aggregated timeline data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                   listens:
 *                     type: integer
 *                   uniqueTracks:
 *                     type: integer
 *                   uniqueArtists:
 *                     type: integer
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
    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");

    let startDate: Date;
    let endDate: Date;

    if (!hasStartDate && !hasEndDate) {
      // "All" filter: use actual min/max from DB
      const userId = extractOptionalUserId(request);
      const range = await getListenDateRange(userId);
      if (!range) {
        return NextResponse.json([]);
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
    const period = extractPeriod(request, "day");
    const userId = extractOptionalUserId(request);

    let chartData: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;

    switch (period) {
      case "day": {
        const dailyData = await getDailyAggregatedListens(
          startDate,
          endDate,
          userId
        );
        chartData = dailyData.map((day) => ({
          date: day.date,
          listens: day.listens,
          uniqueTracks: day.uniqueTracks,
          uniqueArtists: day.uniqueArtists,
        }));
        break;
      }
      case "week": {
        const weeklyData = await getWeeklyAggregatedListens(
          startDate,
          endDate,
          userId
        );
        chartData = weeklyData.map((week) => ({
          date: week.weekStart,
          listens: week.listens,
          uniqueTracks: week.uniqueTracks,
          uniqueArtists: week.uniqueArtists,
        }));
        break;
      }
      case "month": {
        const monthlyData = await getMonthlyAggregatedListens(
          startDate,
          endDate,
          userId
        );
        chartData = monthlyData.map((month) => ({
          date: month.month,
          listens: month.listens,
          uniqueTracks: month.uniqueTracks,
          uniqueArtists: month.uniqueArtists,
        }));
        break;
      }
    }

    return NextResponse.json(chartData);
  } catch (error) {
    return handleApiError(error, { route: '/api/timeline' });
  }
}

