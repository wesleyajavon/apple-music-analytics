import { NextRequest, NextResponse } from "next/server";
import { buildArtistNetworkGraph } from "@/lib/services/artist-network";
import { ArtistNetworkQueryParams } from "@/lib/dto/artist-network";

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
        return NextResponse.json(
          { error: "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
      params.startDate = startDate;
    }

    if (endDate) {
      const date = new Date(endDate);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)" },
          { status: 400 }
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
        return NextResponse.json(
          { error: "Invalid minPlayCount. Must be a non-negative integer" },
          { status: 400 }
        );
      }
      params.minPlayCount = count;
    }

    if (maxArtists) {
      const max = parseInt(maxArtists, 10);
      if (isNaN(max) || max < 1) {
        return NextResponse.json(
          { error: "Invalid maxArtists. Must be a positive integer" },
          { status: 400 }
        );
      }
      params.maxArtists = max;
    }

    if (proximityWindowMinutes) {
      const window = parseInt(proximityWindowMinutes, 10);
      if (isNaN(window) || window < 1) {
        return NextResponse.json(
          { error: "Invalid proximityWindowMinutes. Must be a positive integer" },
          { status: 400 }
        );
      }
      params.proximityWindowMinutes = window;
    }

    if (minEdgeWeight) {
      const weight = parseFloat(minEdgeWeight);
      if (isNaN(weight) || weight < 0) {
        return NextResponse.json(
          { error: "Invalid minEdgeWeight. Must be a non-negative number" },
          { status: 400 }
        );
      }
      params.minEdgeWeight = weight;
    }

    const graph = await buildArtistNetworkGraph(params);

    return NextResponse.json(graph);
  } catch (error) {
    console.error("Error fetching artist network data:", error);
    return NextResponse.json(
      { error: "Failed to fetch artist network data" },
      { status: 500 }
    );
  }
}


