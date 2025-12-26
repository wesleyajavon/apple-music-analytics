import { NextRequest, NextResponse } from "next/server";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening";

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
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (!["day", "week", "month"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be 'day', 'week', or 'month'" },
        { status: 400 }
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
    console.error("Error fetching timeline data:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}

