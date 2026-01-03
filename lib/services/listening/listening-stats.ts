/**
 * Service layer for listening statistics
 * Handles overview stats and genre distribution calculations
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { OverviewStatsDto } from "../../dto/listening";
import { ARTIST_TO_GENRE_MAP } from "../genre/genre-service";

/**
 * Récupère les statistiques d'aperçu (total d'écoutes, artistes uniques, titres uniques, temps total d'écoute).
 * 
 * Utilise une requête SQL unique avec agrégations pour optimiser les performances.
 * 
 * @param startDate - Date de début pour filtrer les écoutes (optionnel)
 * @param endDate - Date de fin pour filtrer les écoutes (optionnel)
 * @param userId - ID de l'utilisateur pour filtrer les écoutes (optionnel)
 * 
 * @returns Statistiques d'aperçu avec le nombre total d'écoutes, artistes uniques, titres uniques et temps total en secondes
 * 
 * @example
 * ```typescript
 * const stats = await getOverviewStats(
 *   new Date('2024-01-01'),
 *   new Date('2024-12-31'),
 *   'user123'
 * );
 * // { totalListens: 1000, uniqueArtists: 200, uniqueTracks: 500, totalPlayTime: 360000 }
 * ```
 */
export async function getOverviewStats(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<OverviewStatsDto> {
  // Build the query with conditional filters using Prisma.sql fragments
  // Note: SUM(t.duration) returns NULL when all durations are NULL, so we use COALESCE to return 0
  const query = Prisma.sql`
    SELECT 
      COUNT(*)::bigint as total_listens,
      COUNT(DISTINCT l."trackId")::bigint as unique_tracks,
      COUNT(DISTINCT t."artistId")::bigint as unique_artists,
      COALESCE(SUM(t.duration), 0)::bigint as total_play_time
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
  `;

  const result = await prisma.$queryRaw<Array<{
    total_listens: bigint;
    unique_tracks: bigint;
    unique_artists: bigint;
    total_play_time: bigint;
  }>>(query);

  // Convert bigint to number and return
  return {
    totalListens: Number(result[0].total_listens),
    uniqueTracks: Number(result[0].unique_tracks),
    uniqueArtists: Number(result[0].unique_artists),
    totalPlayTime: Number(result[0].total_play_time),
  };
}

/**
 * Calcule la répartition des genres musicaux pour les écoutes dans une plage de dates.
 * 
 * Utilise une agrégation SQL optimisée pour éviter de charger toutes les écoutes en mémoire.
 * Priorise le genre stocké dans la track, puis le mapping artiste->genre, puis 'Unknown'.
 * 
 * @param startDate - Date de début pour filtrer les écoutes (optionnel)
 * @param endDate - Date de fin pour filtrer les écoutes (optionnel)
 * @param userId - ID de l'utilisateur pour filtrer les écoutes (optionnel)
 * 
 * @returns Tableau de paires genre/compte, trié par compte décroissant
 * 
 * @example
 * ```typescript
 * const distribution = await getGenreDistribution(
 *   new Date('2024-01-01'),
 *   new Date('2024-12-31'),
 *   'user123'
 * );
 * // [{ genre: 'Rock', count: 500 }, { genre: 'Pop', count: 300 }, ...]
 * ```
 */
export async function getGenreDistribution(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<Array<{ genre: string; count: number }>> {
  // Build the mapping as a VALUES clause for SQL
  // Use COALESCE to prioritize track.genre, then fallback to ARTIST_TO_GENRE_MAP, then 'Unknown'
  const genreMapEntries = Object.entries(ARTIST_TO_GENRE_MAP);
  
  // If there are no entries in the map, use a simpler query
  if (genreMapEntries.length === 0) {
    const query = Prisma.sql`
      SELECT 
        COALESCE(t.genre, 'Unknown') as genre,
        COUNT(*)::int as count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE 1=1
        ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
        ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY COALESCE(t.genre, 'Unknown')
      ORDER BY count DESC
    `;

    const result = await prisma.$queryRaw<Array<{ genre: string; count: bigint }>>(query);

    return result.map(row => ({
      genre: row.genre,
      count: Number(row.count),
    }));
  }

  // Build VALUES clause for the genre mapping
  const valuesParts = genreMapEntries.map(([artist, genre]) =>
    Prisma.sql`(${artist}, ${genre})`
  );

  // Use COALESCE with CASE statement to prioritize track.genre, then artist mapping, then 'Unknown'
  const query = Prisma.sql`
    SELECT 
      COALESCE(
        t.genre,
        genre_map.genre,
        'Unknown'
      ) as genre,
      COUNT(*)::int as count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    LEFT JOIN (
      VALUES ${Prisma.join(valuesParts)}
    ) AS genre_map(artist_name, genre) ON a.name = genre_map.artist_name
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY COALESCE(t.genre, genre_map.genre, 'Unknown')
    ORDER BY count DESC
  `;

  const result = await prisma.$queryRaw<Array<{ genre: string; count: bigint }>>(query);

  return result.map(row => ({
    genre: row.genre,
    count: Number(row.count),
  }));
}

