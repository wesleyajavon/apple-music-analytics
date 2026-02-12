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
 *     summary: Gets advanced temporal analysis of listens
 *     description: Returns listening patterns by day of week and hour of day, with peak moment identification
 *     tags:
 *       - Temporal Analysis
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format (optional, uses all historical data if not provided)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format (optional, uses all historical data if not provided)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *     responses:
 *       200:
 *         description: Complete temporal analysis
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
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
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
