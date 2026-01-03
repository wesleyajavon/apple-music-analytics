import { NextRequest, NextResponse } from "next/server";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening/listening-aggregation";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/timeline:
 *   get:
 *     summary: Récupère les données de timeline d'écoute
 *     description: Retourne des données agrégées par jour/semaine/mois, optimisées pour les graphiques
 *     tags:
 *       - Timeline
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début au format ISO 8601 (optionnel, défaut: 30 jours avant)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin au format ISO 8601 (optionnel, défaut: aujourd'hui)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *         description: Période d'agrégation (jour, semaine ou mois)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *     responses:
 *       200:
 *         description: Données agrégées de timeline
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                   listens:
 *                     type: integer
 *                   uniqueTracks:
 *                     type: integer
 *                   uniqueArtists:
 *                     type: integer
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
    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const { startDate, endDate } = extractDateRangeWithDefaults(
      request,
      defaultStartDate,
      defaultEndDate
    );
    const period = extractPeriod(request, "day");
    const userId = extractOptionalUserId(request);

    let chartData: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;

    switch (period) {
      case "day": {
        const dailyData = await getDailyAggregatedListens(
          startDate,
          endDate,
          userId
        );
        chartData = dailyData.map((day) => ({
          date: day.date,
          listens: day.listens,
          uniqueTracks: day.uniqueTracks,
          uniqueArtists: day.uniqueArtists,
        }));
        break;
      }
      case "week": {
        const weeklyData = await getWeeklyAggregatedListens(
          startDate,
          endDate,
          userId
        );
        chartData = weeklyData.map((week) => ({
          date: week.weekStart,
          listens: week.listens,
          uniqueTracks: week.uniqueTracks,
          uniqueArtists: week.uniqueArtists,
        }));
        break;
      }
      case "month": {
        const monthlyData = await getMonthlyAggregatedListens(
          startDate,
          endDate,
          userId
        );
        chartData = monthlyData.map((month) => ({
          date: month.month,
          listens: month.listens,
          uniqueTracks: month.uniqueTracks,
          uniqueArtists: month.uniqueArtists,
        }));
        break;
      }
    }

    return NextResponse.json(chartData);
  } catch (error) {
    return handleApiError(error, { route: '/api/timeline' });
  }
}

