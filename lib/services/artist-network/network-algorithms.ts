/**
 * Network algorithms for artist network graphs
 * Handles proximity calculations and edge building
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { ArtistEdge } from "../../dto/artist-network";

/**
 * Builds proximity-based edges between artists based on listening patterns.
 * 
 * Artists are connected if they were listened to within a specified time window.
 * 
 * @param where - Prisma where clause for filtering listens
 * @param nodeIds - Set of artist IDs to include in the network
 * @param proximityWindowMinutes - Time window in minutes for proximity connections
 * 
 * @returns Array of proximity-based edges
 */
export async function buildProximityEdges(
  where: Prisma.ListenWhereInput,
  nodeIds: Set<string>,
  proximityWindowMinutes: number
): Promise<ArtistEdge[]> {
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

  const proximityEdges: ArtistEdge[] = [];
  const proximityEdgeMap = new Map<string, ArtistEdge>();

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
      const existingProximityEdge = proximityEdgeMap.get(edgeKey);

      if (existingProximityEdge) {
        // Update existing proximity edge
        existingProximityEdge.weight += 1;
        existingProximityEdge.proximityScore = (existingProximityEdge.proximityScore || 0) + 1;
      } else {
        // Create new proximity edge
        const newEdge: ArtistEdge = {
          source: currentArtistId,
          target: nextArtistId,
          weight: 1,
          type: "proximity",
          proximityScore: 1,
        };
        proximityEdgeMap.set(edgeKey, newEdge);
      }
    }
  }

  return Array.from(proximityEdgeMap.values());
}

