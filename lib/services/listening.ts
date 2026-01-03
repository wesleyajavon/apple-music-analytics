/**
 * Service layer for listening data operations
 * Handles database queries and data aggregation
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import {
  ListenDto,
  AggregatedListenDto,
  DailyListenDto,
  WeeklyListenDto,
  MonthlyListenDto,
  ListensQueryParams,
  OverviewStatsDto,
} from "../dto/listening";
import { getGenreForArtist, ARTIST_TO_GENRE_MAP } from "./genre-service";
import { executeDateAggregation, AggregationResult } from "./listening-aggregation";

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

/**
 * Agrège les écoutes par jour.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées par jour avec le nombre d'écoutes, titres uniques et artistes uniques
 */
export async function getDailyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<DailyListenDto[]> {
  const result = await executeDateAggregation(startDate, endDate, 'day', userId);

  return result.map((row) => ({
    date: row.date as string,
    listens: row.listens,
    uniqueTracks: row.unique_tracks,
    uniqueArtists: row.unique_artists,
  }));
}

/**
 * Helper function to group daily data by week
 */
function groupDailyIntoWeekly(
  dailyData: DailyListenDto[],
  weeklyAggregations: AggregationResult[]
): WeeklyListenDto[] {
  const dailyMap = new Map(dailyData.map(d => [d.date, d]));

  return weeklyAggregations.map((row) => {
    // For week aggregations, date is always a Date object
    const weekStart = row.date instanceof Date ? row.date : new Date(row.date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    // Extract daily breakdown for this week from the daily data
    const dailyBreakdown: DailyListenDto[] = [];
    const currentDate = new Date(weekStart);
    
    while (currentDate <= weekEnd) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dailyData = dailyMap.get(dateStr);
      if (dailyData) {
        dailyBreakdown.push(dailyData);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      weekStart: weekStart.toISOString().split("T")[0],
      weekEnd: weekEnd.toISOString().split("T")[0],
      listens: row.listens,
      uniqueTracks: row.unique_tracks,
      uniqueArtists: row.unique_artists,
      dailyBreakdown,
    };
  });
}

/**
 * Agrège les écoutes par semaine.
 * 
 * Les semaines commencent le lundi et se terminent le dimanche.
 * Inclut une décomposition quotidienne pour chaque semaine.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées par semaine avec décomposition quotidienne
 */
export async function getWeeklyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<WeeklyListenDto[]> {
  // Récupérer toutes les données quotidiennes une seule fois
  const allDailyData = await getDailyAggregatedListens(startDate, endDate, userId);
  
  // Récupérer les agrégations hebdomadaires
  const weeklyAggregations = await executeDateAggregation(startDate, endDate, 'week', userId);

  // Grouper en semaines en mémoire
  return groupDailyIntoWeekly(allDailyData, weeklyAggregations);
}

/**
 * Helper function to group daily data by month
 */
function groupDailyIntoMonthly(
  dailyData: DailyListenDto[],
  monthlyAggregations: AggregationResult[]
): MonthlyListenDto[] {
  const dailyMap = new Map(dailyData.map(d => [d.date, d]));

  return monthlyAggregations.map((row) => {
    // For month aggregations, date is always a string in format YYYY-MM
    const month = typeof row.date === 'string' ? row.date : row.date.toISOString().slice(0, 7);
    const [year, monthNum] = month.split("-");
    const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month

    // Extract daily breakdown for this month from the daily data
    const dailyBreakdown: DailyListenDto[] = [];
    const currentDate = new Date(monthStart);
    
    while (currentDate <= monthEnd) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dailyData = dailyMap.get(dateStr);
      if (dailyData) {
        dailyBreakdown.push(dailyData);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      month,
      listens: row.listens,
      uniqueTracks: row.unique_tracks,
      uniqueArtists: row.unique_artists,
      dailyBreakdown,
    };
  });
}

/**
 * Agrège les écoutes par mois.
 * 
 * Inclut une décomposition quotidienne pour chaque mois.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées par mois avec décomposition quotidienne
 */
export async function getMonthlyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<MonthlyListenDto[]> {
  // Récupérer toutes les données quotidiennes une seule fois
  const allDailyData = await getDailyAggregatedListens(startDate, endDate, userId);
  
  // Récupérer les agrégations mensuelles
  const monthlyAggregations = await executeDateAggregation(startDate, endDate, 'month', userId);

  // Grouper en mois en mémoire
  return groupDailyIntoMonthly(allDailyData, monthlyAggregations);
}

/**
 * Récupère les écoutes agrégées pour un type de période spécifique.
 * 
 * @param startDate - Date de début de la plage
 * @param endDate - Date de fin de la plage
 * @param period - Type de période ('day', 'week', ou 'month')
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Tableau de données agrégées selon la période spécifiée
 */
export async function getAggregatedListens(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId?: string
): Promise<AggregatedListenDto[]> {
  switch (period) {
    case "day": {
      const daily = await getDailyAggregatedListens(startDate, endDate, userId);
      return daily.map((d) => ({
        date: d.date,
        count: d.listens,
        uniqueTracks: d.uniqueTracks,
        uniqueArtists: d.uniqueArtists,
      }));
    }
    case "week": {
      const weekly = await getWeeklyAggregatedListens(startDate, endDate, userId);
      return weekly.map((w) => ({
        date: w.weekStart,
        count: w.listens,
        uniqueTracks: w.uniqueTracks,
        uniqueArtists: w.uniqueArtists,
      }));
    }
    case "month": {
      const monthly = await getMonthlyAggregatedListens(startDate, endDate, userId);
      return monthly.map((m) => ({
        date: m.month,
        count: m.listens,
        uniqueTracks: m.uniqueTracks,
        uniqueArtists: m.uniqueArtists,
      }));
    }
  }
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
