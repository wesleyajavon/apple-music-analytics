/**
 * Service for building artist network graphs
 * Creates nodes (artists) and edges (connections) based on listening patterns
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import {
  ArtistNetworkGraph,
  ArtistNode,
  ArtistEdge,
  ArtistNetworkQueryParams,
} from "../../dto/artist-network";
import { getGenreForArtist } from "../genre/genre-service";
import { DEFAULT_PROXIMITY_WINDOW_MINUTES } from "../../constants/config";
import { buildProximityEdges } from "./network-algorithms";

/**
 * Calcule le réseau d'artistes basé sur les habitudes d'écoute.
 * 
 * @param params - Paramètres de requête pour filtrer les données
 * @param params.userId - ID de l'utilisateur (optionnel)
 * @param params.startDate - Date de début au format ISO 8601 (optionnel)
 * @param params.endDate - Date de fin au format ISO 8601 (optionnel)
 * @param params.minPlayCount - Nombre minimum d'écoutes pour inclure un artiste (défaut: 1)
 * @param params.maxArtists - Nombre maximum d'artistes à inclure (optionnel)
 * @param params.proximityWindowMinutes - Fenêtre temporelle pour les connexions de proximité (défaut: 30)
 * @param params.minEdgeWeight - Poids minimum des arêtes à inclure (défaut: 1)
 * 
 * @returns Graphe d'artistes avec nœuds et arêtes
 * 
 * @example
 * ```typescript
 * const graph = await buildArtistNetworkGraph({
 *   userId: 'user123',
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   minPlayCount: 5
 * });
 * ```
 */
export async function buildArtistNetworkGraph(
  params: ArtistNetworkQueryParams = {}
): Promise<ArtistNetworkGraph> {
  const {
    userId,
    startDate,
    endDate,
    minPlayCount = 1,
    maxArtists,
    proximityWindowMinutes = DEFAULT_PROXIMITY_WINDOW_MINUTES,
    minEdgeWeight = 1,
  } = params;

  // Build where clause for listens
  const where: Prisma.ListenWhereInput = {};

  if (userId) {
    where.userId = userId;
  }

  if (startDate || endDate) {
    where.playedAt = {};
    if (startDate) {
      where.playedAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.playedAt.lte = new Date(endDate);
    }
  }

  // Step 1: Get artists with play counts
  const artistPlayCounts = await prisma.listen.groupBy({
    by: ["trackId"],
    where,
    _count: {
      id: true,
    },
  });

  // Get track and artist information
  const trackIds = artistPlayCounts.map((item) => item.trackId);
  const tracks = await prisma.track.findMany({
    where: {
      id: {
        in: trackIds,
      },
    },
    include: {
      artist: true,
    },
  });

  // Aggregate play counts by artist
  const artistMap = new Map<
    string,
    {
      id: string;
      name: string;
      playCount: number;
      genres: Set<string>;
      mbid?: string;
      imageUrl?: string;
    }
  >();

  for (const track of tracks) {
    const artistId = track.artistId;
    const playCount = artistPlayCounts.find(
      (item) => item.trackId === track.id
    )?._count.id || 0;

    if (playCount < minPlayCount) {
      continue;
    }

    const existing = artistMap.get(artistId);
    if (existing) {
      existing.playCount += playCount;
      if (track.genre) {
        existing.genres.add(track.genre);
      }
    } else {
      artistMap.set(artistId, {
        id: artistId,
        name: track.artist.name,
        playCount,
        genres: track.genre ? new Set([track.genre]) : new Set(),
        mbid: track.artist.mbid || undefined,
        imageUrl: track.artist.imageUrl || undefined,
      });
    }
  }

  // Convert to array and sort by play count
  let artists = Array.from(artistMap.values()).sort(
    (a, b) => b.playCount - a.playCount
  );

  // Limit number of artists if specified
  if (maxArtists && maxArtists > 0) {
    artists = artists.slice(0, maxArtists);
  }

  // Step 2: Build nodes
  const nodes: ArtistNode[] = artists.map((artist) => {
    const genresArray = Array.from(artist.genres);
    const primaryGenre =
      genresArray.length > 0
        ? genresArray[0]
        : getGenreForArtist(artist.name);

    return {
      id: artist.id,
      name: artist.name,
      genre: primaryGenre,
      genres: genresArray.length > 0 ? genresArray : undefined,
      playCount: artist.playCount,
      imageUrl: artist.imageUrl,
      mbid: artist.mbid,
    };
  });

  // Create a map for quick artist lookup
  const artistIdMap = new Map(artists.map((a) => [a.id, a]));
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Step 3: Build edges based on genres and proximity
  const edges: ArtistEdge[] = [];
  const edgeMap = new Map<string, ArtistEdge>();

  // Genre-based edges
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];

      const artist1 = artistIdMap.get(node1.id);
      const artist2 = artistIdMap.get(node2.id);

      if (!artist1 || !artist2) continue;

      // Find shared genres
      const sharedGenres = Array.from(artist1.genres).filter((g) =>
        artist2.genres.has(g)
      );

      if (sharedGenres.length > 0) {
        const edgeKey = [node1.id, node2.id].sort().join("|");
        const weight = sharedGenres.length * 2; // Weight based on number of shared genres

        edgeMap.set(edgeKey, {
          source: node1.id,
          target: node2.id,
          weight,
          type: "genre",
          sharedGenres,
        });
      }
    }
  }

  // Proximity-based edges (artists listened to close in time)
  const proximityEdges = await buildProximityEdges(
    where,
    nodeIds,
    proximityWindowMinutes
  );

  // Merge proximity edges into edgeMap
  for (const edge of proximityEdges) {
    const edgeKey = [edge.source, edge.target].sort().join("|");
    const existingEdge = edgeMap.get(edgeKey);

    if (existingEdge) {
      // Update existing edge to include proximity
      existingEdge.weight += edge.weight;
      existingEdge.type = "both";
      existingEdge.proximityScore = (existingEdge.proximityScore || 0) + (edge.proximityScore || 0);
    } else {
      edgeMap.set(edgeKey, edge);
    }
  }

  // Convert edge map to array and filter by minEdgeWeight
  edges.push(
    ...Array.from(edgeMap.values()).filter((edge) => edge.weight >= minEdgeWeight)
  );

  // Step 4: Build metadata
  const metadata = {
    totalArtists: nodes.length,
    totalConnections: edges.length,
    ...(startDate && endDate
      ? {
          dateRange: {
            start: startDate,
            end: endDate,
          },
        }
      : {}),
  };

  return {
    nodes,
    edges,
    metadata,
  };
}

