import { NextRequest, NextResponse } from "next/server";
import { getTemporalAnalysis } from "@/lib/services/listening/temporal-analysis";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";
import { TemporalAnalysisDto } from "@/lib/dto/listening";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/temporal-analysis:
 *   get:
 *     summary: Récupère l'analyse temporelle avancée des écoutes
 *     description: Retourne les patterns d'écoute par jour de la semaine et par heure de la journée, avec identification des moments de pic
 *     tags:
 *       - Temporal Analysis
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début au format ISO 8601 (optionnel, si non fourni utilise toutes les données historiques)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin au format ISO 8601 (optionnel, si non fourni utilise toutes les données historiques)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *     responses:
 *       200:
 *         description: Analyse temporelle complète
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 byDayOfWeek:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       dayOfWeek:
 *                         type: integer
 *                       dayName:
 *                         type: string
 *                       listens:
 *                         type: integer
 *                       uniqueTracks:
 *                         type: integer
 *                       uniqueArtists:
 *                         type: integer
 *                 byHourOfDay:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       hour:
 *                         type: integer
 *                       listens:
 *                         type: integer
 *                       uniqueTracks:
 *                         type: integer
 *                       uniqueArtists:
 *                         type: integer
 *                 peakDay:
 *                   type: object
 *                   nullable: true
 *                 peakHour:
 *                   type: object
 *                   nullable: true
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
    // Pour l'analyse temporelle, on utilise toutes les données si aucune date n'est fournie
    // Cela permet d'avoir des patterns fiables basés sur l'historique complet
    const { startDate, endDate } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);

    const result = await getTemporalAnalysis(startDate, endDate, userId);

    // Mapper les résultats du service vers les DTOs
    const dto: TemporalAnalysisDto = {
      byDayOfWeek: result.byDayOfWeek.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        dayName: day.dayName,
        listens: day.listens,
        uniqueTracks: day.uniqueTracks,
        uniqueArtists: day.uniqueArtists,
      })),
      byHourOfDay: result.byHourOfDay.map((hour) => ({
        hour: hour.hour,
        listens: hour.listens,
        uniqueTracks: hour.uniqueTracks,
        uniqueArtists: hour.uniqueArtists,
      })),
      peakDay: result.peakDay
        ? {
            dayOfWeek: result.peakDay.dayOfWeek,
            dayName: result.peakDay.dayName,
            listens: result.peakDay.listens,
            uniqueTracks: result.peakDay.uniqueTracks,
            uniqueArtists: result.peakDay.uniqueArtists,
          }
        : null,
      peakHour: result.peakHour
        ? {
            hour: result.peakHour.hour,
            listens: result.peakHour.listens,
            uniqueTracks: result.peakHour.uniqueTracks,
            uniqueArtists: result.peakHour.uniqueArtists,
          }
        : null,
    };

    return NextResponse.json(dto);
  } catch (error) {
    return handleApiError(error, { route: "/api/temporal-analysis" });
  }
}
