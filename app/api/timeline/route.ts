import { NextRequest, NextResponse } from "next/server";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * GET /api/timeline
 * 
 * Route API pour récupérer les données de timeline d'écoute
 * Retourne des données agrégées par jour/semaine/mois, optimisées pour les graphiques
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional, defaults to 30 days ago)
 * - endDate: ISO 8601 date string (optional, defaults to today)
 * - period: "day" | "week" | "month" (optional, defaults to "day")
 * - userId: User ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const { startDate, endDate } = extractDateRangeWithDefaults(
      request,
      defaultStartDate,
      defaultEndDate
    );
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

