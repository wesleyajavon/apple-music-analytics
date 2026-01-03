import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/services/listening/listening-stats";
import { OverviewStatsDto } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/overview:
 *   get:
 *     summary: Récupère les statistiques d'aperçu
 *     description: Retourne les statistiques globales d'écoute (total d'écoutes, artistes uniques, titres uniques, temps total)
 *     tags:
 *       - Overview
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
 *         description: Statistiques d'aperçu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverviewStats'
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

    const stats = await getOverviewStats(startDate, endDate, userId);

    const response: OverviewStatsDto = stats;

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/overview' });
  }
}


