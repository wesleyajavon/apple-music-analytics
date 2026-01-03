/**
 * Service layer for listening data operations
 * Handles basic CRUD operations for listens
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import {
  ListenDto,
  ListensQueryParams,
} from "../../dto/listening";

/**
 * Récupère les écoutes avec des filtres optionnels.
 * 
 * @param params - Paramètres de requête pour filtrer et paginer les écoutes
 * @param params.startDate - Date de début au format ISO 8601 (optionnel)
 * @param params.endDate - Date de fin au format ISO 8601 (optionnel)
 * @param params.userId - ID de l'utilisateur (optionnel)
 * @param params.limit - Nombre maximum d'écoutes à retourner (défaut: 100)
 * @param params.offset - Nombre d'écoutes à ignorer pour la pagination (défaut: 0)
 * @param params.source - Source des écoutes ('lastfm' ou 'apple_music_replay', optionnel)
 * 
 * @returns Objet contenant les données des écoutes et le total
 * 
 * @example
 * ```typescript
 * const { data, total } = await getListens({
 *   userId: 'user123',
 *   startDate: '2024-01-01',
 *   limit: 50,
 *   offset: 0
 * });
 * ```
 */
export async function getListens(
  params: ListensQueryParams = {}
): Promise<{ data: ListenDto[]; total: number }> {
  const {
    startDate,
    endDate,
    userId,
    limit = 100,
    offset = 0,
    source,
  } = params;

  const where: Prisma.ListenWhereInput = {};

  if (startDate || endDate) {
    where.playedAt = {};
    if (startDate) {
      where.playedAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.playedAt.lte = new Date(endDate);
    }
  }

  if (userId) {
    where.userId = userId;
  }

  if (source) {
    where.source = source;
  }

  const [listens, total] = await Promise.all([
    prisma.listen.findMany({
      where,
      include: {
        track: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: {
        playedAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.listen.count({ where }),
  ]);

  const data: ListenDto[] = listens.map((listen) => ({
    id: listen.id,
    trackTitle: listen.track.title,
    artistName: listen.track.artist.name,
    playedAt: listen.playedAt.toISOString(),
    source: listen.source as "lastfm" | "apple_music_replay",
  }));

  return { data, total };
}

