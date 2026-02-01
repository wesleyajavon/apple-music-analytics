import { NextRequest, NextResponse } from "next/server";
import { getArtistStats, getArtistOverview } from "@/lib/services/artist/artist-service";
import { ArtistsResponseDto } from "@/lib/dto/artist";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/artists:
 *   get:
 *     summary: Récupère les statistiques des artistes
 *     description: Retourne les statistiques détaillées des artistes les plus écoutés avec vue d'ensemble
 *     tags:
 *       - Artists
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre maximum d'artistes à retourner
 *     responses:
 *       200:
 *         description: Statistiques des artistes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistsResponse'
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
export async function GET(request: NextRequest) {
  try {
    const { startDate, endDate } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);
    
    // Extraire le paramètre limit
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Valider le limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Le paramètre limit doit être entre 1 et 100" },
        { status: 400 }
      );
    }

    const [overview, topArtists] = await Promise.all([
      getArtistOverview(startDate, endDate, userId),
      getArtistStats(startDate, endDate, userId, limit)
    ]);

    const response: ArtistsResponseDto = {
      overview,
      topArtists
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/artists' });
  }
}
