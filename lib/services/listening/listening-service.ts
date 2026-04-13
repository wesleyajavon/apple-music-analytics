/**
 * Service layer for listening data operations
 * Handles basic CRUD operations for listens
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import type { ListenRecordSource } from "@/lib/constants/listen-source";
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
      // Pour startDate, utiliser le début de la journée en UTC pour éviter les problèmes de fuseau horaire
      // Format attendu: YYYY-MM-DD
      const [year, month, day] = startDate.split("-").map(Number);
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      where.playedAt.gte = start;
    }
    if (endDate) {
      // Pour endDate, utiliser la fin de la journée en UTC (23:59:59.999)
      // Cela permet d'inclure toutes les écoutes de la journée quelle que soit l'heure locale
      const [year, month, day] = endDate.split("-").map(Number);
      const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      where.playedAt.lte = end;
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
    source: listen.source as ListenRecordSource,
  }));

  return { data, total };
}

/**
 * Interface pour les données d'écoute avec genre (pour export)
 */
export interface ListenExportDto {
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  artistName: string;
  trackTitle: string;
  genre: string | null;
  source: ListenRecordSource;
}

/**
 * Paramètres de requête pour l'export des écoutes
 */
export interface ListensExportParams {
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
  userId?: string;
  source?: ListenRecordSource;
}

/**
 * Récupère toutes les écoutes avec genre pour l'export CSV.
 * Cette fonction ne pagine pas et retourne toutes les écoutes correspondant aux filtres.
 * 
 * @param params - Paramètres de requête pour filtrer les écoutes
 * @param params.startDate - Date de début au format ISO 8601 (optionnel)
 * @param params.endDate - Date de fin au format ISO 8601 (optionnel)
 * @param params.userId - ID de l'utilisateur (optionnel)
 * @param params.source - Source des écoutes ('lastfm' ou 'apple_music_replay', optionnel)
 * 
 * @returns Tableau des écoutes avec genre pour export
 * 
 * @example
 * ```typescript
 * const listens = await getAllListensForExport({
 *   userId: 'user123',
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31'
 * });
 * ```
 */
export async function getAllListensForExport(
  params: ListensExportParams = {}
): Promise<ListenExportDto[]> {
  const {
    startDate,
    endDate,
    userId,
    source,
  } = params;

  const where: Prisma.ListenWhereInput = {};

  if (startDate || endDate) {
    where.playedAt = {};
    if (startDate) {
      const [year, month, day] = startDate.split("-").map(Number);
      const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      where.playedAt.gte = start;
    }
    if (endDate) {
      const [year, month, day] = endDate.split("-").map(Number);
      const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      where.playedAt.lte = end;
    }
  }

  if (userId) {
    where.userId = userId;
  }

  if (source) {
    where.source = source;
  }

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
      playedAt: "desc",
    },
    // Pas de limite pour l'export complet
  });

  return listens.map((listen) => ({
    date: listen.playedAt.toISOString().split("T")[0], // Format YYYY-MM-DD
    artistName: listen.track.artist.name,
    trackTitle: listen.track.title,
    genre: listen.track.genre,
    source: listen.source as ListenRecordSource,
  }));
}

/**
 * Récupère la plage de dates réelle des écoutes en base (min et max playedAt).
 * Utile pour le filtre "All" qui doit afficher toutes les données du premier au dernier jour.
 *
 * @param userId - ID de l'utilisateur (optionnel)
 * @returns Objet avec minDate et maxDate, ou null si aucune écoute en base
 */
export async function getListenDateRange(userId?: string): Promise<{
  minDate: Date;
  maxDate: Date;
} | null> {
  const where: Prisma.ListenWhereInput = {};
  if (userId) {
    where.userId = userId;
  }

  const result = await prisma.listen.aggregate({
    where,
    _min: { playedAt: true },
    _max: { playedAt: true },
  });

  const minDate = result._min.playedAt;
  const maxDate = result._max.playedAt;

  if (!minDate || !maxDate) {
    return null;
  }

  return { minDate, maxDate };
}



