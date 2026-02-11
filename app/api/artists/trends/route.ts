import { NextRequest, NextResponse } from "next/server";
import { getArtistTrends } from "@/lib/services/artist/artist-service";
import { ArtistTrendsResponseDto } from "@/lib/dto/artist";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractRequiredDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/artists/trends:
 *   get:
 *     summary: Gets artist trends over time
 *     description: Returns listening evolution for top artists over a given period
 *     tags:
 *       - Artists
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Aggregation period
 *       - in: query
 *         name: topN
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of artists to include
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *     responses:
 *       200:
 *         description: Artist trends
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const { startDate, endDate } = extractRequiredDateRange(request);
    const userId = extractOptionalUserId(request);
    
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "day";
    const topNParam = searchParams.get("topN");
    const topN = topNParam ? parseInt(topNParam, 10) : 5;

    // Valider le period
    if (!["day", "week", "month"].includes(periodParam)) {
      return NextResponse.json(
        { error: "Le paramètre period doit être 'day', 'week' ou 'month'" },
        { status: 400 }
      );
    }

    // Valider topN
    if (isNaN(topN) || topN < 1 || topN > 20) {
      return NextResponse.json(
        { error: "Le paramètre topN doit être entre 1 et 20" },
        { status: 400 }
      );
    }

    const period = periodParam as "day" | "week" | "month";
    const data = await getArtistTrends(startDate, endDate, period, userId, topN);

    const response: ArtistTrendsResponseDto = {
      data,
      period,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/artists/trends' });
  }
}
