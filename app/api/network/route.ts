import { NextRequest, NextResponse } from "next/server";
import { buildArtistNetworkGraph } from "@/lib/services/artist-network/network-builder";
import { ArtistNetworkQueryParams } from "@/lib/dto/artist-network";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
  extractOptionalInteger,
  extractOptionalFloat,
  extractOptionalString,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/network:
 *   get:
 *     summary: Récupère le réseau d'artistes
 *     description: Retourne un graphe avec les nœuds (artistes) et les arêtes (connexions basées sur les genres et la proximité temporelle)
 *     tags:
 *       - Network
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
 *         name: minPlayCount
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 1
 *         description: Nombre minimum d'écoutes pour inclure un artiste
 *       - in: query
 *         name: maxArtists
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Nombre maximum d'artistes à inclure
 *       - in: query
 *         name: proximityWindowMinutes
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 30
 *         description: Fenêtre temporelle en minutes pour les connexions de proximité
 *       - in: query
 *         name: minEdgeWeight
 *         schema:
 *           type: number
 *           minimum: 0
 *           default: 1
 *         description: Poids minimum des arêtes à inclure
 *     responses:
 *       200:
 *         description: Graphe du réseau d'artistes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistNetworkGraph'
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
    const params: ArtistNetworkQueryParams = {};

    const { startDate, endDate } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);

    if (startDate) {
      params.startDate = startDate.toISOString().split("T")[0];
    }
    if (endDate) {
      params.endDate = endDate.toISOString().split("T")[0];
    }
    if (userId) {
      params.userId = userId;
    }

    const minPlayCount = extractOptionalInteger(request, "minPlayCount", {
      min: 0,
      errorMessage: "Invalid minPlayCount. Must be a non-negative integer",
    });
    if (minPlayCount !== undefined) {
      params.minPlayCount = minPlayCount;
    }

    const maxArtists = extractOptionalInteger(request, "maxArtists", {
      min: 1,
      errorMessage: "Invalid maxArtists. Must be a positive integer",
    });
    if (maxArtists !== undefined) {
      params.maxArtists = maxArtists;
    }

    const proximityWindowMinutes = extractOptionalInteger(
      request,
      "proximityWindowMinutes",
      {
        min: 1,
        errorMessage:
          "Invalid proximityWindowMinutes. Must be a positive integer",
      }
    );
    if (proximityWindowMinutes !== undefined) {
      params.proximityWindowMinutes = proximityWindowMinutes;
    }

    const minEdgeWeight = extractOptionalFloat(request, "minEdgeWeight", {
      min: 0,
      errorMessage: "Invalid minEdgeWeight. Must be a non-negative number",
    });
    if (minEdgeWeight !== undefined) {
      params.minEdgeWeight = minEdgeWeight;
    }

    const graph = await buildArtistNetworkGraph(params);

    return NextResponse.json(graph);
  } catch (error) {
    return handleApiError(error, { route: '/api/network' });
  }
}


