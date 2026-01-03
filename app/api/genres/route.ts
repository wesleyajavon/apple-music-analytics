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
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Récupère la distribution des genres musicaux
 *     description: Retourne la répartition des écoutes par genre avec les comptages et pourcentages
 *     tags:
 *       - Genres
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début au format ISO 8601 (optionnel)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin au format ISO 8601 (optionnel)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *     responses:
 *       200:
 *         description: Distribution des genres
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GenreDistribution'
 *                 totalListens:
 *                   type: integer
 *                   description: Nombre total d'écoutes
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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


