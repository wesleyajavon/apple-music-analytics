/**
 * Service layer for Apple Music Replay data operations
 * Handles import, validation, and storage of yearly Replay summaries
 */

import { prisma } from "../../prisma";
import {
  ReplayYearlyInput,
  validateReplayYearlyInput,
  ReplayValidationResult,
} from "../../dto/replay";

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
 * Importe un résumé annuel Apple Music Replay.
 * 
 * Valide les données d'entrée et crée/met à jour l'enregistrement ReplayYearly
 * ainsi que tous les top artistes, titres et albums associés.
 * Utilise une transaction pour assurer la cohérence des données.
 * 
 * @param userId - ID de l'utilisateur pour associer le résumé
 * @param data - Données du résumé Replay (format ReplayYearlyInput)
 * 
 * @returns Résultat de l'import avec succès, ID du résumé créé/mis à jour, ou erreurs de validation
 * 
 * @example
 * ```typescript
 * const result = await importReplayYearly('user123', {
 *   year: 2024,
 *   totalPlayTime: 360000,
 *   totalPlays: 1000,
 *   topArtists: [...],
 *   topTracks: [...],
 *   topAlbums: [...]
 * });
 * // { success: true, replayYearlyId: 'id123' } ou { success: false, errors: [...] }
 * ```
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
        const artistNameLower = artistInput.name.toLowerCase();
        const artist = await tx.artist.upsert({
          where: { name: artistInput.name },
          update: {
            nameLower: artistNameLower, // Always update nameLower
            // Update imageUrl if provided
            ...(artistInput.imageUrl && { imageUrl: artistInput.imageUrl }),
          },
          create: {
            name: artistInput.name,
            nameLower: artistNameLower,
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
          const artistNameLower = trackInput.artistName.toLowerCase();
          const artist = await tx.artist.upsert({
            where: { name: trackInput.artistName },
            update: {
              nameLower: artistNameLower, // Always update nameLower
            },
            create: {
              name: trackInput.artistName,
              nameLower: artistNameLower,
            },
          });
          artistId = artist.id;
          artistMap.set(trackInput.artistName, artistId);
        }

        // Create or find track
        const trackTitleLower = trackInput.title.toLowerCase();
        const track = await tx.track.upsert({
          where: {
            unique_title_artist: {
              title: trackInput.title,
              artistId,
            },
          },
          update: {
            titleLower: trackTitleLower, // Always update titleLower
            // Update duration if provided
            ...(trackInput.duration && { duration: trackInput.duration }),
          },
          create: {
            title: trackInput.title,
            titleLower: trackTitleLower,
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
 * Récupère tous les résumés annuels Apple Music Replay pour un utilisateur.
 * 
 * @param userId - ID de l'utilisateur
 * 
 * @returns Tableau de résumés annuels avec les top artistes, top titres et top albums, triés par année décroissante
 * 
 * @example
 * ```typescript
 * const summaries = await getReplayYearlySummaries('user123');
 * // [{ year: 2024, topArtists: [...], topTracks: [...], ... }, ...]
 * ```
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
 * Récupère un résumé annuel Apple Music Replay spécifique pour un utilisateur et une année.
 * 
 * @param userId - ID de l'utilisateur
 * @param year - Année du résumé (ex: 2024)
 * 
 * @returns Résumé annuel avec les top artistes, top titres et top albums pour l'année spécifiée, ou null si non trouvé
 * 
 * @example
 * ```typescript
 * const summary = await getReplayYearlySummary('user123', 2024);
 * // { year: 2024, topArtists: [...], topTracks: [...], ... } ou null
 * ```
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

