import { NextRequest, NextResponse } from "next/server";
import { buildArtistNetworkGraph } from "@/lib/services/artist-network";
import { ArtistNetworkQueryParams } from "@/lib/dto/artist-network";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";

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
    const { searchParams } = new URL(request.url);

    const params: ArtistNetworkQueryParams = {};

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const minPlayCount = searchParams.get("minPlayCount");
    const maxArtists = searchParams.get("maxArtists");
    const proximityWindowMinutes = searchParams.get("proximityWindowMinutes");
    const minEdgeWeight = searchParams.get("minEdgeWeight");

    if (startDate) {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        throw createValidationError(
          "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
          { startDate }
        );
      }
      params.startDate = startDate;
    }

    if (endDate) {
      const date = new Date(endDate);
      if (isNaN(date.getTime())) {
        throw createValidationError(
          "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
          { endDate }
        );
      }
      params.endDate = endDate;
    }

    if (userId) {
      params.userId = userId;
    }

    if (minPlayCount) {
      const count = parseInt(minPlayCount, 10);
      if (isNaN(count) || count < 0) {
        throw createValidationError(
          "Invalid minPlayCount. Must be a non-negative integer",
          { minPlayCount }
        );
      }
      params.minPlayCount = count;
    }

    if (maxArtists) {
      const max = parseInt(maxArtists, 10);
      if (isNaN(max) || max < 1) {
        throw createValidationError(
          "Invalid maxArtists. Must be a positive integer",
          { maxArtists }
        );
      }
      params.maxArtists = max;
    }

    if (proximityWindowMinutes) {
      const window = parseInt(proximityWindowMinutes, 10);
      if (isNaN(window) || window < 1) {
        throw createValidationError(
          "Invalid proximityWindowMinutes. Must be a positive integer",
          { proximityWindowMinutes }
        );
      }
      params.proximityWindowMinutes = window;
    }

    if (minEdgeWeight) {
      const weight = parseFloat(minEdgeWeight);
      if (isNaN(weight) || weight < 0) {
        throw createValidationError(
          "Invalid minEdgeWeight. Must be a non-negative number",
          { minEdgeWeight }
        );
      }
      params.minEdgeWeight = weight;
    }

    const graph = await buildArtistNetworkGraph(params);

    return NextResponse.json(graph);
  } catch (error) {
    return handleApiError(error, { route: '/api/network' });
  }
}


