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
import { getGenreForArtist } from "./genre-service";
import { executeDateAggregation, AggregationResult } from "./listening-aggregation";

/**
 * Fetch listens with optional filters
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
 * Aggregate listens by day
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
 * Aggregate listens by week
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
 * Aggregate listens by month
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
 * Get aggregated listens for a specific period type
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
 * Get genre distribution for listens within a date range
 */
export async function getGenreDistribution(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<Array<{ genre: string; count: number }>> {
  const where: Prisma.ListenWhereInput = {};

  if (startDate || endDate) {
    where.playedAt = {};
    if (startDate) {
      where.playedAt.gte = startDate;
    }
    if (endDate) {
      where.playedAt.lte = endDate;
    }
  }

  if (userId) {
    where.userId = userId;
  }

  // Récupérer toutes les écoutes avec les artistes
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

  // Agréger par genre
  // Utiliser le genre du track s'il existe, sinon fallback sur le mapping artiste
  const genreCounts: Record<string, number> = {};

  for (const listen of listens) {
    // Type assertion temporaire jusqu'à ce que Prisma soit régénéré avec le nouveau schéma
    const trackGenre = (listen.track as any).genre;
    const genre = trackGenre || getGenreForArtist(listen.track.artist.name);
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  }

  // Convertir en tableau et trier par count décroissant
  return Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get overview statistics (total listens, unique artists, unique tracks, total play time)
 * Optimized with a single SQL query using aggregations
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

