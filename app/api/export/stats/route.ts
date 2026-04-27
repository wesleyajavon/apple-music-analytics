import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats, getGenreDistribution } from "@/lib/services/listening/listening-stats";
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from "@/lib/services/listening/listening-aggregation";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
} from "@/lib/middleware/validation";
import { generateExportFilename } from "@/lib/utils/csv-utils";
import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import {
  applyRateLimitHeaders,
  assertRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

const EXPORT_STATS_RATE_LIMIT = {
  route: "/api/export/stats",
  windowMs: 60_000,
  maxRequests: 10,
} as const;

/**
 * Interface pour les statistiques exportées
 */
interface ExportStatsResponse {
  metadata: {
    exportedAt: string;
    startDate?: string;
    endDate?: string;
    period: string;
  };
  overview: {
    totalListens: number;
    uniqueArtists: number;
    uniqueTracks: number;
    totalPlayTime: number; // en secondes
  };
  genres: Array<{
    genre: string;
    count: number;
    percentage: number;
  }>;
  timeline: {
    daily?: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;
    weekly?: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;
    monthly?: Array<{
      date: string;
      listens: number;
      uniqueTracks: number;
      uniqueArtists: number;
    }>;
  };
}

/**
 * @swagger
 * /api/export/stats:
 *   get:
 *     summary: Exports aggregated statistics in JSON format
 *     description: |
 *       Exports all analytics (overview, genres, timeline) in structured JSON format.
 *       Data is filtered by the provided date parameters.
 *       JSON format enables easy reuse of data for other tools.
 *     tags:
 *       - Export
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json]
 *           default: json
 *         description: Export format (currently only JSON is supported)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format (YYYY-MM-DD, optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format (YYYY-MM-DD, optional)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *       - in: query
 *         name: includeTimeline
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: true
 *         description: Include timeline data (optional, default: true)
 *     responses:
 *       200:
 *         description: Statistics JSON file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     exportedAt:
 *                       type: string
 *                       format: date-time
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                     period:
 *                       type: string
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalListens:
 *                       type: integer
 *                     uniqueArtists:
 *                       type: integer
 *                     uniqueTracks:
 *                       type: integer
 *                     totalPlayTime:
 *                       type: integer
 *                 genres:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       genre:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       percentage:
 *                         type: number
 *                 timeline:
 *                   type: object
 *                   properties:
 *                     daily:
 *                       type: array
 *                     weekly:
 *                       type: array
 *                     monthly:
 *                       type: array
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
  let rateLimit: RateLimitResult | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    // Vérifier que le format est supporté
    if (format !== "json") {
      return NextResponse.json(
        {
          error: "Unsupported format",
          message: `Format "${format}" is not supported. Only "json" is available.`,
        },
        { status: 400 }
      );
    }

    // Extraire les paramètres de filtrage
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const auth = await requireRecentAuthenticatedUser(request);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    rateLimit = await assertRateLimit(request, {
      ...EXPORT_STATS_RATE_LIMIT,
      userId,
    });
    const includeTimeline = searchParams.get("includeTimeline") !== "false";

    // Convertir les dates en format ISO string pour les services
    const startDate = startDateObj?.toISOString().split("T")[0];
    const endDate = endDateObj?.toISOString().split("T")[0];

    // Récupérer toutes les statistiques en parallèle
    const [overviewStats, genreCounts] = await Promise.all([
      getOverviewStats(startDateObj, endDateObj, userId),
      getGenreDistribution(startDateObj, endDateObj, userId),
    ]);

    // Calculer les pourcentages pour les genres
    const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);
    const genres = genreCounts.map((item) => ({
      genre: item.genre,
      count: item.count,
      percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
    }));

    // Récupérer les données de timeline si demandées
    const timeline: ExportStatsResponse["timeline"] = {};
    if (includeTimeline && startDateObj && endDateObj) {
      const [daily, weekly, monthly] = await Promise.all([
        getDailyAggregatedListens(startDateObj, endDateObj, userId),
        getWeeklyAggregatedListens(startDateObj, endDateObj, userId),
        getMonthlyAggregatedListens(startDateObj, endDateObj, userId),
      ]);

      timeline.daily = daily.map((item) => ({
        date: item.date,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      }));

      timeline.weekly = weekly.map((item) => ({
        date: item.weekStart,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      }));

      timeline.monthly = monthly.map((item) => ({
        date: item.month,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      }));
    } else if (includeTimeline) {
      // Si les dates ne sont pas fournies, utiliser des valeurs par défaut pour la timeline
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30); // 30 derniers jours par défaut

      const [daily, weekly, monthly] = await Promise.all([
        getDailyAggregatedListens(defaultStartDate, defaultEndDate, userId),
        getWeeklyAggregatedListens(defaultStartDate, defaultEndDate, userId),
        getMonthlyAggregatedListens(defaultStartDate, defaultEndDate, userId),
      ]);

      timeline.daily = daily.map((item) => ({
        date: item.date,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      }));

      timeline.weekly = weekly.map((item) => ({
        date: item.weekStart,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      }));

      timeline.monthly = monthly.map((item) => ({
        date: item.month,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      }));
    }

    // Construire la réponse
    const response: ExportStatsResponse = {
      metadata: {
        exportedAt: new Date().toISOString(),
        startDate,
        endDate,
        period: startDate && endDate ? `${startDate} to ${endDate}` : "all",
      },
      overview: {
        totalListens: overviewStats.totalListens,
        uniqueArtists: overviewStats.uniqueArtists,
        uniqueTracks: overviewStats.uniqueTracks,
        totalPlayTime: overviewStats.totalPlayTime,
      },
      genres,
      timeline,
    };

    // Générer le nom de fichier avec timestamp
    const filename = generateExportFilename("stats", "json");

    // Retourner le JSON avec les bons headers
    const rawResponse = new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
    return applyRateLimitHeaders(rawResponse, rateLimit, EXPORT_STATS_RATE_LIMIT);
  } catch (error) {
    const response = handleApiError(error, { route: "/api/export/stats" });
    if (rateLimit) {
      return applyRateLimitHeaders(response, rateLimit, EXPORT_STATS_RATE_LIMIT);
    }
    return response;
  }
}
