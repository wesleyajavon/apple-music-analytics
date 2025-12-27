/**
 * Service layer for Apple Music Replay data operations
 * Handles import, validation, and storage of yearly Replay summaries
 */

import { prisma } from "../prisma";
import {
  ReplayYearlyInput,
  validateReplayYearlyInput,
  ReplayValidationResult,
} from "../dto/replay";

/**
 * Result of Replay import operation
 */
export interface ReplayImportResult {
  success: boolean;
  replayYearlyId?: string;
  errors?: string[];
  validationErrors?: ReplayValidationResult["errors"];
}

/**
 * Import a yearly Replay summary
 * This function validates the input and creates/updates the ReplayYearly record
 * along with all related top artists, tracks, and albums
 */
export async function importReplayYearly(
  userId: string,
  data: unknown
): Promise<ReplayImportResult> {
  // Validate the input data
  const validation = validateReplayYearlyInput(data);

  if (!validation.isValid) {
    return {
      success: false,
      validationErrors: validation.errors,
      errors: validation.errors.map((e) => `${e.field}: ${e.message}`),
    };
  }

  const input = data as ReplayYearlyInput;

  try {
    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Check if a ReplayYearly record already exists for this year and user
      const existing = await tx.replayYearly.findUnique({
        where: {
          userId_year: {
            userId,
            year: input.year,
          },
        },
      });

      // If it exists, delete the old data (cascade will handle related records)
      if (existing) {
        await tx.replayYearly.delete({
          where: {
            id: existing.id,
          },
        });
      }

      // Create or find artists from topArtists
      const artistMap = new Map<string, string>(); // artistName -> artistId
      for (const artistInput of input.topArtists) {
        const artist = await tx.artist.upsert({
          where: { name: artistInput.name },
          update: {
            // Update imageUrl if provided
            ...(artistInput.imageUrl && { imageUrl: artistInput.imageUrl }),
          },
          create: {
            name: artistInput.name,
            ...(artistInput.imageUrl && { imageUrl: artistInput.imageUrl }),
          },
        });
        artistMap.set(artistInput.name, artist.id);
      }

      // Create or find artists and tracks from topTracks
      const trackMap = new Map<string, string>(); // "artistName|trackTitle" -> trackId
      for (const trackInput of input.topTracks) {
        // Ensure artist exists
        let artistId = artistMap.get(trackInput.artistName);
        if (!artistId) {
          const artist = await tx.artist.upsert({
            where: { name: trackInput.artistName },
            update: {},
            create: {
              name: trackInput.artistName,
            },
          });
          artistId = artist.id;
          artistMap.set(trackInput.artistName, artistId);
        }

        // Create or find track
        const track = await tx.track.upsert({
          where: {
            unique_title_artist: {
              title: trackInput.title,
              artistId,
            },
          },
          update: {
            // Update duration if provided
            ...(trackInput.duration && { duration: trackInput.duration }),
          },
          create: {
            title: trackInput.title,
            artistId,
            ...(trackInput.duration && { duration: trackInput.duration }),
          },
        });
        trackMap.set(`${trackInput.artistName}|${trackInput.title}`, track.id);
      }

      // Create the ReplayYearly record
      const replayYearly = await tx.replayYearly.create({
        data: {
          userId,
          year: input.year,
          totalPlayTime: input.totalPlayTime,
          totalPlays: input.totalPlays,
        },
      });

      // Create top artists
      await tx.replayTopArtist.createMany({
        data: input.topArtists.map((artistInput) => ({
          replayYearlyId: replayYearly.id,
          artistId: artistMap.get(artistInput.name)!,
          rank: artistInput.rank,
          playCount: artistInput.playCount,
        })),
      });

      // Create top tracks
      await tx.replayTopTrack.createMany({
        data: input.topTracks.map((trackInput) => ({
          replayYearlyId: replayYearly.id,
          trackId: trackMap.get(
            `${trackInput.artistName}|${trackInput.title}`
          )!,
          rank: trackInput.rank,
          playCount: trackInput.playCount,
        })),
      });

      // Create top albums (no separate Album model, so we store names directly)
      await tx.replayTopAlbum.createMany({
        data: input.topAlbums.map((albumInput) => ({
          replayYearlyId: replayYearly.id,
          albumName: albumInput.name,
          artistName: albumInput.artistName,
          rank: albumInput.rank,
          playCount: albumInput.playCount,
        })),
      });

      return replayYearly.id;
    });

    return {
      success: true,
      replayYearlyId: result,
    };
  } catch (error) {
    console.error("Error importing Replay data:", error);
    return {
      success: false,
      errors: [
        error instanceof Error
          ? error.message
          : "Unknown error occurred during import",
      ],
    };
  }
}

/**
 * Get all Replay yearly summaries for a user
 */
export async function getReplayYearlySummaries(userId: string) {
  return await prisma.replayYearly.findMany({
    where: {
      userId,
    },
    include: {
      topArtists: {
        include: {
          artist: true,
        },
        orderBy: {
          rank: "asc",
        },
      },
      topTracks: {
        include: {
          track: {
            include: {
              artist: true,
            },
          },
        },
        orderBy: {
          rank: "asc",
        },
      },
      topAlbums: {
        orderBy: {
          rank: "asc",
        },
      },
    },
    orderBy: {
      year: "desc",
    },
  });
}

/**
 * Get a specific Replay yearly summary
 */
export async function getReplayYearlySummary(
  userId: string,
  year: number
) {
  return await prisma.replayYearly.findUnique({
    where: {
      userId_year: {
        userId,
        year,
      },
    },
    include: {
      topArtists: {
        include: {
          artist: true,
        },
        orderBy: {
          rank: "asc",
        },
      },
      topTracks: {
        include: {
          track: {
            include: {
              artist: true,
            },
          },
        },
        orderBy: {
          rank: "asc",
        },
      },
      topAlbums: {
        orderBy: {
          rank: "asc",
        },
      },
    },
  });
}

