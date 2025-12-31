import { NextRequest, NextResponse } from "next/server";
import { buildArtistNetworkGraph } from "@/lib/services/artist-network";
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
 * GET /api/network
 * 
 * Route API pour récupérer les données du réseau d'artistes
 * Retourne un graphe avec les nœuds (artistes) et les arêtes (connexions)
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - userId: User ID (optional)
 * - minPlayCount: Minimum play count to include an artist (optional, default: 1)
 * - maxArtists: Maximum number of artists to include (optional)
 * - proximityWindowMinutes: Time window for proximity-based edges (optional, default: 30)
 * - minEdgeWeight: Minimum edge weight to include (optional, default: 1)
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


