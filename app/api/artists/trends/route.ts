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
 *     summary: Récupère les tendances des artistes dans le temps
 *     description: Retourne l'évolution des écoutes pour les top artistes sur une période donnée
 *     tags:
 *       - Artists
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début au format ISO 8601
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin au format ISO 8601
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Période d'agrégation
 *       - in: query
 *         name: topN
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Nombre d'artistes à inclure
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *     responses:
 *       200:
 *         description: Tendances des artistes
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
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
