/**
 * Service for building artist network graphs
 * Creates nodes (artists) and edges (connections) based on listening patterns
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import {
  ArtistNetworkGraph,
  ArtistNode,
  ArtistEdge,
  ArtistNetworkQueryParams,
} from "../dto/artist-network";
import { getGenreForArtist } from "./genre-service";

/**
 * Build an artist network graph based on listening data
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
    proximityWindowMinutes = 30,
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
  const proximityWindowMs = proximityWindowMinutes * 60 * 1000;

  // Get all listens ordered by time for proximity calculation
  const allListens = await prisma.listen.findMany({
    where: {
      ...where,
      track: {
        artistId: {
          in: Array.from(nodeIds),
        },
      },
    },
    include: {
      track: {
        include: {
          artist: true,
        },
      },
    },
    orderBy: {
      playedAt: "asc",
    },
  });

  // Group listens by time windows to find proximity
  for (let i = 0; i < allListens.length; i++) {
    const currentListen = allListens[i];
    const currentTime = currentListen.playedAt.getTime();
    const currentArtistId = currentListen.track.artistId;

    if (!nodeIds.has(currentArtistId)) continue;

    // Look ahead for listens within the proximity window
    for (let j = i + 1; j < allListens.length; j++) {
      const nextListen = allListens[j];
      const nextTime = nextListen.playedAt.getTime();
      const timeDiff = nextTime - currentTime;

      if (timeDiff > proximityWindowMs) {
        break; // Beyond the window, stop looking
      }

      const nextArtistId = nextListen.track.artistId;
      if (!nodeIds.has(nextArtistId)) continue;

      // Don't create self-loops
      if (currentArtistId === nextArtistId) continue;

      const edgeKey = [currentArtistId, nextArtistId].sort().join("|");
      const existingEdge = edgeMap.get(edgeKey);

      if (existingEdge) {
        // Update existing edge to include proximity
        existingEdge.weight += 1;
        existingEdge.type = "both";
        existingEdge.proximityScore = (existingEdge.proximityScore || 0) + 1;
      } else {
        // Create new proximity edge
        edgeMap.set(edgeKey, {
          source: currentArtistId,
          target: nextArtistId,
          weight: 1,
          type: "proximity",
          proximityScore: 1,
        });
      }
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
