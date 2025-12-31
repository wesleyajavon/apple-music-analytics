import { NextRequest, NextResponse } from "next/server";
import { getGenreDistribution } from "@/lib/services/listening";
import { GenreDistributionResponse } from "@/lib/dto/genres";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

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
    const { startDate, endDate } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);

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
    return handleApiError(error, { route: '/api/genres' });
  }
}


