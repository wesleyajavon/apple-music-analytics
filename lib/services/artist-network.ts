/**
 * Service layer for artist network graph data preparation
 * Builds artist nodes from listening history and creates edges based on
 * shared genres and listening proximity
 */

import { prisma } from "../prisma";
import {
  ArtistNetworkGraph,
  ArtistNode,
  ArtistEdge,
  ArtistNetworkQueryParams,
} from "../dto/artist-network";

/**
 * Mapping simplifié des artistes vers les genres
 * Réutilise le mapping existant du service listening
 * À remplacer par une vraie API de genres (Last.fm, MusicBrainz, etc.) dans le futur
 */
const ARTIST_TO_GENRE_MAP: Record<string, string> = {
  "The Weeknd": "R&B",
  "Dua Lipa": "Pop",
  "Taylor Swift": "Pop",
  "Arctic Monkeys": "Indie Rock",
  "Kendrick Lamar": "Hip-Hop",
  "Daft Punk": "Electronic",
  "Bon Iver": "Indie Folk",
  "Beach House": "Dream Pop",
  // Ajoutez plus de mappings selon vos besoins
};

/**
 * Fonction helper pour obtenir le genre d'un artiste
 * Retourne "Unknown" si l'artiste n'est pas dans le mapping
 */
function getGenreForArtist(artistName: string): string {
  return ARTIST_TO_GENRE_MAP[artistName] || "Unknown";
}

/**
 * Build artist nodes from listening history
 * Aggregates play counts and includes artist metadata
 */
async function buildArtistNodes(
  params: ArtistNetworkQueryParams
): Promise<ArtistNode[]> {
  const {
    userId,
    startDate,
    endDate,
    minPlayCount = 1,
    maxArtists,
  } = params;

  const where: any = {};

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

  // Use Prisma's query builder to get listens with artist information
  const listens = await prisma.listen.findMany({
    where,
    include: {
      track: {
        include: {
          artist: true,
        },
      },
    },
  });

  // Aggregate by artist
  const artistMap = new Map<
    string,
    {
      id: string;
      name: string;
      imageUrl?: string;
      mbid?: string;
      playCount: number;
    }
  >();

  for (const listen of listens) {
    const artist = listen.track.artist;
    const existing = artistMap.get(artist.id);

    if (existing) {
      existing.playCount++;
    } else {
      artistMap.set(artist.id, {
        id: artist.id,
        name: artist.name,
        imageUrl: artist.imageUrl || undefined,
        mbid: artist.mbid || undefined,
        playCount: 1,
      });
    }
  }

  // Convert to nodes and filter
  const nodes: ArtistNode[] = Array.from(artistMap.values())
    .filter((artist) => artist.playCount >= minPlayCount)
    .map((artist) => ({
      id: artist.id,
      name: artist.name,
      genre: getGenreForArtist(artist.name),
      playCount: artist.playCount,
      imageUrl: artist.imageUrl,
      mbid: artist.mbid,
    }))
    .sort((a, b) => b.playCount - a.playCount);

  // Apply maxArtists limit
  return maxArtists ? nodes.slice(0, maxArtists) : nodes;
}

/**
 * Create edges based on shared genres
 * Two artists are connected if they share at least one genre
 */
function createGenreEdges(nodes: ArtistNode[]): ArtistEdge[] {
  const edges: ArtistEdge[] = [];
  const nodeMap = new Map<string, ArtistNode>(
    nodes.map((node) => [node.id, node])
  );

  // Create edges for artists with shared genres
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Check if they share a genre
      const genreA = nodeA.genre;
      const genreB = nodeB.genre;

      if (genreA !== "Unknown" && genreA === genreB) {
        edges.push({
          source: nodeA.id,
          target: nodeB.id,
          weight: 1, // Base weight for genre connection
          type: "genre",
          sharedGenres: [genreA],
        });
      }
    }
  }

  return edges;
}

/**
 * Create edges based on listening proximity
 * Two artists are connected if they were listened to within a time window
 */
async function createProximityEdges(
  nodes: ArtistNode[],
  params: ArtistNetworkQueryParams
): Promise<ArtistEdge[]> {
  const { userId, startDate, endDate, proximityWindowMinutes = 30 } = params;

  const where: any = {};

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

  // Get all listens with artist information, ordered by time
  const listens = await prisma.listen.findMany({
    where,
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

  // Create a set of artist IDs we care about (for filtering)
  const relevantArtistIds = new Set(nodes.map((node) => node.id));

  // Track proximity connections
  const proximityMap = new Map<string, number>(); // "artistId1|artistId2" -> count

  // Calculate proximity: artists listened within the time window
  for (let i = 0; i < listens.length; i++) {
    const currentListen = listens[i];
    const currentArtistId = currentListen.track.artistId;

    // Skip if artist is not in our node set
    if (!relevantArtistIds.has(currentArtistId)) {
      continue;
    }

    const currentTime = currentListen.playedAt.getTime();
    const windowMs = proximityWindowMinutes * 60 * 1000;

    // Look ahead for listens within the time window
    for (let j = i + 1; j < listens.length; j++) {
      const nextListen = listens[j];
      const nextTime = nextListen.playedAt.getTime();
      const timeDiff = nextTime - currentTime;

      // If we've exceeded the time window, stop looking
      if (timeDiff > windowMs) {
        break;
      }

      const nextArtistId = nextListen.track.artistId;

      // Skip if same artist or artist not in our node set
      if (
        currentArtistId === nextArtistId ||
        !relevantArtistIds.has(nextArtistId)
      ) {
        continue;
      }

      // Create edge key (normalized: smaller ID first)
      const edgeKey =
        currentArtistId < nextArtistId
          ? `${currentArtistId}|${nextArtistId}`
          : `${nextArtistId}|${currentArtistId}`;

      // Increment proximity count
      proximityMap.set(edgeKey, (proximityMap.get(edgeKey) || 0) + 1);
    }
  }

  // Convert proximity map to edges
  const edges: ArtistEdge[] = [];
  for (const [edgeKey, count] of proximityMap.entries()) {
    const [sourceId, targetId] = edgeKey.split("|");
    edges.push({
      source: sourceId,
      target: targetId,
      weight: count,
      type: "proximity",
      proximityScore: count,
    });
  }

  return edges;
}

/**
 * Merge edges and combine weights for artists with both genre and proximity connections
 */
function mergeEdges(genreEdges: ArtistEdge[], proximityEdges: ArtistEdge[]): ArtistEdge[] {
  const edgeMap = new Map<string, ArtistEdge>(); // "source|target" -> edge

  // Add genre edges
  for (const edge of genreEdges) {
    const key = `${edge.source}|${edge.target}`;
    edgeMap.set(key, { ...edge });
  }

  // Merge proximity edges
  for (const edge of proximityEdges) {
    const key = `${edge.source}|${edge.target}`;
    const existing = edgeMap.get(key);

    if (existing) {
      // Merge: combine weights and types
      existing.weight += edge.weight;
      existing.type = "both";
      existing.proximityScore = edge.proximityScore;
    } else {
      // New edge
      edgeMap.set(key, { ...edge });
    }
  }

  return Array.from(edgeMap.values());
}

/**
 * Main function to build the artist network graph
 */
export async function buildArtistNetworkGraph(
  params: ArtistNetworkQueryParams = {}
): Promise<ArtistNetworkGraph> {
  const { startDate, endDate, minEdgeWeight = 1 } = params;

  // Build nodes
  const nodes = await buildArtistNodes(params);

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      metadata: {
        totalArtists: 0,
        totalConnections: 0,
        ...(startDate && endDate
          ? {
              dateRange: {
                start: startDate,
                end: endDate,
              },
            }
          : {}),
      },
    };
  }

  // Create edges based on genres
  const genreEdges = createGenreEdges(nodes);

  // Create edges based on proximity
  const proximityEdges = await createProximityEdges(nodes, params);

  // Merge edges
  let edges = mergeEdges(genreEdges, proximityEdges);

  // Filter by minimum edge weight
  edges = edges.filter((edge) => edge.weight >= minEdgeWeight);

  return {
    nodes,
    edges,
    metadata: {
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
    },
  };
}

