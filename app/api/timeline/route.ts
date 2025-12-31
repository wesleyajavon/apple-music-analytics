import { NextRequest, NextResponse } from "next/server";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";

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
    const { searchParams } = new URL(request.url);

    // Default to last 30 days if no dates provided
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : (() => {
          const date = new Date(endDate);
          date.setDate(date.getDate() - 30);
          return date;
        })();

    const period = (searchParams.get("period") || "day") as
      | "day"
      | "week"
      | "month";
    const userId = searchParams.get("userId") || undefined;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw createValidationError(
        "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)",
        { startDate: searchParams.get("startDate"), endDate: searchParams.get("endDate") }
      );
    }

    if (!["day", "week", "month"].includes(period)) {
      throw createValidationError(
        "Invalid period. Must be 'day', 'week', or 'month'",
        { period }
      );
    }

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

