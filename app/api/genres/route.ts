import { NextRequest, NextResponse } from "next/server";
import { getGenreDistribution } from "@/lib/services/listening";
import { GenreDistributionResponse } from "@/lib/dto/genres";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * GET /api/genres
 * 
 * Route API pour récupérer la distribution des genres
 * Retourne les genres avec leurs comptages et pourcentages
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - userId: User ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const userId = searchParams.get("userId") || undefined;

    if (startDate && isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Récupérer la distribution des genres
    const genreCounts = await getGenreDistribution(startDate, endDate, userId);

    // Calculer le total
    const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);

    // Ajouter les pourcentages
    const data = genreCounts.map((item) => ({
      genre: item.genre,
      count: item.count,
      percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
    }));

    const response: GenreDistributionResponse = {
      data,
      totalListens,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching genre distribution:", error);
    return NextResponse.json(
      { error: "Failed to fetch genre distribution" },
      { status: 500 }
    );
  }
}


