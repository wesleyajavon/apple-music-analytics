import { NextRequest, NextResponse } from "next/server";
import { getDailyAggregatedListens } from "@/lib/services/listening";

/**
 * GET /api/timeline
 * 
 * Route API pour récupérer les données de timeline d'écoute
 * Retourne des données agrégées par jour, optimisées pour les graphiques
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional, defaults to 30 days ago)
 * - endDate: ISO 8601 date string (optional, defaults to today)
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

    const userId = searchParams.get("userId") || undefined;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const dailyData = await getDailyAggregatedListens(
      startDate,
      endDate,
      userId
    );

    // Transform to chart-friendly format
    const chartData = dailyData.map((day) => ({
      date: day.date,
      listens: day.listens,
      uniqueTracks: day.uniqueTracks,
      uniqueArtists: day.uniqueArtists,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}

