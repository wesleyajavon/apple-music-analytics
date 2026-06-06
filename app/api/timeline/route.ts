import { NextRequest } from "next/server";
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
} from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { isActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import {
  getPublicProfileTimelineAllTimeCached,
  getPublicProfileTimelineRangeCached,
} from "@/lib/services/listening/public-timeline-cached";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";
const TIMELINE_RATE_LIMIT = {
  route: "/api/timeline",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

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
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertAnalyticsRateLimit(request, TIMELINE_RATE_LIMIT, userId);

    const isPublicDemoDataset = await isActivePublicProfileUserId(userId);

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");
    const period = extractPeriod(request, "day");

    if (!hasStartDate && !hasEndDate && isPublicDemoDataset) {
      const chartData = await getPublicProfileTimelineAllTimeCached(
        userId,
        period
      );
      return publicDemoJsonResponse(chartData, true);
    }

    let startDate: Date;
    let endDate: Date;

    if (!hasStartDate && !hasEndDate) {
      const range = await getListenDateRange(userId);
      if (!range) {
        return publicDemoJsonResponse([], false);
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

    let chartData: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;

    if (isPublicDemoDataset && (hasStartDate || hasEndDate)) {
      chartData = await getPublicProfileTimelineRangeCached(
        userId,
        startDate,
        endDate,
        period
      );
    } else {
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
    }

    return publicDemoJsonResponse(chartData, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: '/api/timeline' });
  }
}

