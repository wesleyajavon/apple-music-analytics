import { NextRequest, NextResponse } from "next/server";
import { getListens, getAggregatedListens } from "@/lib/services/listening";
import { ListensResponse, AggregatedListensResponse } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractRequiredDateRange,
  extractOptionalUserId,
  extractOptionalInteger,
  extractOptionalString,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/listens:
 *   get:
 *     summary: Récupère les écoutes ou les données agrégées
 *     description: |
 *       Récupère la liste des écoutes avec pagination, ou les données agrégées si le paramètre aggregate/period est fourni.
 *       Deux modes de fonctionnement:
 *       - Sans aggregate: Retourne les écoutes individuelles avec pagination
 *       - Avec aggregate: Retourne les données agrégées par période
 *     tags:
 *       - Listens
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début au format ISO 8601 (optionnel, requis si aggregate est fourni)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin au format ISO 8601 (optionnel, requis si aggregate est fourni)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 100
 *         description: Nombre de résultats (mode liste uniquement)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Décalage pour la pagination (mode liste uniquement)
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [lastfm, apple_music_replay]
 *         description: Source des écoutes (mode liste uniquement)
 *       - in: query
 *         name: aggregate
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Période d'agrégation (alias: period)
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Alias pour aggregate
 *     responses:
 *       200:
 *         description: Liste des écoutes ou données agrégées
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ListenDto'
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           uniqueTracks:
 *                             type: integer
 *                           uniqueArtists:
 *                             type: integer
 *                     period:
 *                       type: string
 *                       enum: [day, week, month]
 *                     startDate:
 *                       type: string
 *                     endDate:
 *                       type: string
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
    const { searchParams } = new URL(request.url);
    const aggregate =
      searchParams.get("aggregate") ||
      searchParams.get("period") ||
      null;

    // If aggregate is requested, return aggregated data
    if (aggregate && ["day", "week", "month"].includes(aggregate)) {
      const { startDate, endDate } = extractRequiredDateRange(request);
      const userId = extractOptionalUserId(request);

      const aggregatedData = await getAggregatedListens(
        startDate,
        endDate,
        aggregate as "day" | "week" | "month",
        userId
      );

      const response: AggregatedListensResponse = {
        data: aggregatedData,
        period: aggregate as "day" | "week" | "month",
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };

      return NextResponse.json(response);
    }

    // Otherwise, return raw listens
    const { startDate: startDateObj, endDate: endDateObj } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);
    const limit = extractOptionalInteger(request, "limit", {
      min: 1,
      errorMessage: "Invalid limit. Must be a positive integer",
    }) || 100;
    const offset = extractOptionalInteger(request, "offset", {
      min: 0,
      errorMessage: "Invalid offset. Must be a non-negative integer",
    }) || 0;
    const source = extractOptionalString(request, "source") as
      | "lastfm"
      | "apple_music_replay"
      | undefined;

    // Convert dates to ISO strings for getListens
    const startDate = startDateObj?.toISOString().split("T")[0];
    const endDate = endDateObj?.toISOString().split("T")[0];

    const { data, total } = await getListens({
      startDate,
      endDate,
      userId,
      limit,
      offset,
      source,
    });

    const response: ListensResponse = {
      data,
      total,
      limit,
      offset,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/listens' });
  }
}

