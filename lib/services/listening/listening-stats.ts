/**
 * Service layer for listening statistics
 * Handles overview stats and genre distribution calculations
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { OverviewStatsDto } from "../../dto/listening";
import { ARTIST_TO_GENRE_MAP } from "../genre/genre-service";
import { transformBigIntToNumber } from "../../dto/transformers";

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

  // Convert bigint to number using centralized transformer
  const transformed = transformBigIntToNumber(result[0]);
  return {
    totalListens: transformed.total_listens,
    uniqueTracks: transformed.unique_tracks,
    uniqueArtists: transformed.unique_artists,
    totalPlayTime: transformed.total_play_time,
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
      count: transformBigIntToNumber({ count: row.count }).count,
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
    count: transformBigIntToNumber({ count: row.count }).count,
  }));
}

export type GenreTrendPeriod = "day" | "week" | "month";

export interface GenreTrendRow {
  date: string;
  genre: string;
  count: number;
}

/**
 * Récupère l'évolution des écoutes par genre dans le temps.
 *
 * Agrège les écoutes par (date_bucket, genre) avec la même résolution de genre
 * que getGenreDistribution (track.genre > artist map > 'Unknown').
 *
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @param period - Agrégation : jour, semaine ou mois
 * @param userId - ID utilisateur (optionnel)
 * @returns Tableau { date, genre, count } trié par date puis genre
 */
export async function getGenreTrends(
  startDate: Date,
  endDate: Date,
  period: GenreTrendPeriod,
  userId?: string
): Promise<GenreTrendRow[]> {
  const genreMapEntries = Object.entries(ARTIST_TO_GENRE_MAP);

  const dateExpr =
    period === "day"
      ? Prisma.raw('DATE(l."playedAt")')
      : period === "week"
        ? Prisma.raw('DATE_TRUNC(\'week\', l."playedAt")::date')
        : Prisma.raw('TO_CHAR(l."playedAt", \'YYYY-MM\')');

  if (genreMapEntries.length === 0) {
    const query = Prisma.sql`
      SELECT 
        ${dateExpr}::text as date,
        COALESCE(t.genre, 'Unknown') as genre,
        COUNT(*)::int as count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."playedAt" >= ${startDate}
        AND l."playedAt" <= ${endDate}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY ${dateExpr}, COALESCE(t.genre, 'Unknown')
      ORDER BY ${dateExpr} ASC, count DESC
    `;

    const result = await prisma.$queryRaw<
      Array<{ date: string | Date; genre: string; count: bigint }>
    >(query);

    return result.map((row) => ({
      date: normalizeTrendDate(row.date, period),
      genre: row.genre,
      count: transformBigIntToNumber({ count: row.count }).count,
    }));
  }

  const valuesParts = genreMapEntries.map(([artist, genre]) =>
    Prisma.sql`(${artist}, ${genre})`
  );

  const query = Prisma.sql`
    WITH genre_resolved AS (
      SELECT 
        ${dateExpr} as bucket,
        COALESCE(t.genre, genre_map.genre, 'Unknown') as genre
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      LEFT JOIN (VALUES ${Prisma.join(valuesParts)}) AS genre_map(artist_name, genre)
        ON a.name = genre_map.artist_name
      WHERE l."playedAt" >= ${startDate}
        AND l."playedAt" <= ${endDate}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    )
    SELECT 
      bucket::text as date,
      genre,
      COUNT(*)::int as count
    FROM genre_resolved
    GROUP BY bucket, genre
    ORDER BY bucket ASC, count DESC
  `;

  const result = await prisma.$queryRaw<
    Array<{ date: string | Date; genre: string; count: bigint }>
  >(query);

  return result.map((row) => ({
    date: normalizeTrendDate(row.date, period),
    genre: row.genre,
    count: transformBigIntToNumber({ count: row.count }).count,
  }));
}

function normalizeTrendDate(
  value: string | Date,
  period: GenreTrendPeriod
): string {
  if (typeof value === "string") {
    return value;
  }
  const d = new Date(value);
  if (period === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Récupère les artistes les plus écoutés avec leur nombre d'écoutes.
 * 
 * @param startDate - Date de début pour filtrer les écoutes (optionnel)
 * @param endDate - Date de fin pour filtrer les écoutes (optionnel)
 * @param userId - ID de l'utilisateur pour filtrer les écoutes (optionnel)
 * @param limit - Nombre maximum d'artistes à retourner (par défaut: 10)
 * 
 * @returns Tableau d'artistes avec leur nombre d'écoutes, trié par nombre d'écoutes décroissant
 * 
 * @example
 * ```typescript
 * const topArtists = await getTopArtists(
 *   new Date('2024-01-01'),
 *   new Date('2024-12-31'),
 *   'user123',
 *   10
 * );
 * // [{ artistId: '1', artistName: 'Artist Name', listenCount: 500 }, ...]
 * ```
 */
export async function getTopArtists(
  startDate?: Date,
  endDate?: Date,
  userId?: string,
  limit: number = 10
): Promise<Array<{ artistId: string; artistName: string; listenCount: number }>> {
  const query = Prisma.sql`
    SELECT 
      a.id as artist_id,
      a.name as artist_name,
      COUNT(*)::bigint as listen_count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY a.id, a.name
    ORDER BY listen_count DESC
    LIMIT ${limit}
  `;

  const result = await prisma.$queryRaw<Array<{
    artist_id: string;
    artist_name: string;
    listen_count: bigint;
  }>>(query);

  return result.map(row => ({
    artistId: row.artist_id,
    artistName: row.artist_name,
    listenCount: transformBigIntToNumber({ count: row.listen_count }).count,
  }));
}

