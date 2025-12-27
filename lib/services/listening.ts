/**
 * Service layer for listening data operations
 * Handles database queries and data aggregation
 */

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
import { executeDateAggregation } from "./listening-aggregation";

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

  const where: any = {};

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
 * Aggregate listens by week
 */
export async function getWeeklyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<WeeklyListenDto[]> {
  const result = await executeDateAggregation(startDate, endDate, 'week', userId);

  // Get daily breakdown for each week
  const weeklyData: WeeklyListenDto[] = await Promise.all(
    result.map(async (row) => {
      const weekStart = row.date instanceof Date ? row.date : new Date(row.date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

      const dailyBreakdown = await getDailyAggregatedListens(
        weekStart,
        weekEnd,
        userId
      );

      return {
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        listens: row.listens,
        uniqueTracks: row.unique_tracks,
        uniqueArtists: row.unique_artists,
        dailyBreakdown,
      };
    })
  );

  return weeklyData;
}

/**
 * Aggregate listens by month
 */
export async function getMonthlyAggregatedListens(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<MonthlyListenDto[]> {
  const result = await executeDateAggregation(startDate, endDate, 'month', userId);

  // Get daily breakdown for each month
  const monthlyData: MonthlyListenDto[] = await Promise.all(
    result.map(async (row) => {
      const month = row.date as string;
      const [year, monthNum] = month.split("-");
      const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month

      const dailyBreakdown = await getDailyAggregatedListens(
        monthStart,
        monthEnd,
        userId
      );

      return {
        month,
        listens: row.listens,
        uniqueTracks: row.unique_tracks,
        uniqueArtists: row.unique_artists,
        dailyBreakdown,
      };
    })
  );

  return monthlyData;
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
  const where: any = {};

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
  const genreCounts: Record<string, number> = {};

  for (const listen of listens) {
    const genre = getGenreForArtist(listen.track.artist.name);
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  }

  // Convertir en tableau et trier par count décroissant
  return Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get overview statistics (total listens, unique artists, unique tracks, total play time)
 */
export async function getOverviewStats(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<OverviewStatsDto> {
  const where: any = {};

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

  // Get total listens count
  const totalListens = await prisma.listen.count({ where });

  // Get unique tracks (distinct trackIds)
  const uniqueTrackIds = await prisma.listen.findMany({
    where,
    select: { trackId: true },
    distinct: ['trackId'],
  });

  const uniqueTracksCount = uniqueTrackIds.length;

  // Get unique artists from the unique tracks
  const tracksWithArtists = await prisma.track.findMany({
    where: {
      id: { in: uniqueTrackIds.map(l => l.trackId) },
    },
    select: { artistId: true },
  });

  const uniqueArtistIds = new Set(tracksWithArtists.map(t => t.artistId));
  const uniqueArtistsCount = uniqueArtistIds.size;

  // Get total play time by summing track durations for all listens
  const listensWithTracks = await prisma.listen.findMany({
    where,
    select: {
      track: {
        select: {
          duration: true,
        },
      },
    },
  });

  const totalPlayTime = listensWithTracks.reduce((sum, listen) => {
    return sum + (listen.track.duration || 0);
  }, 0);

  return {
    totalListens,
    uniqueArtists: uniqueArtistsCount,
    uniqueTracks: uniqueTracksCount,
    totalPlayTime,
  };
}

