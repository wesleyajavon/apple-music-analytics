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
} from "../dto/listening";

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
  const where: any = {
    playedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    where.userId = userId;
  }

  // Use raw SQL for efficient date aggregation
  const query = userId
    ? prisma.$queryRaw<
        Array<{
          date: string;
          listens: bigint;
          unique_tracks: bigint;
          unique_artists: bigint;
        }>
      >`
        SELECT 
          DATE(played_at) as date,
          COUNT(*)::int as listens,
          COUNT(DISTINCT track_id)::int as unique_tracks,
          COUNT(DISTINCT t.artist_id)::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l.track_id = t.id
        WHERE l.played_at >= ${startDate}
          AND l.played_at <= ${endDate}
          AND l.user_id = ${userId}
        GROUP BY DATE(played_at)
        ORDER BY date ASC
      `
    : prisma.$queryRaw<
        Array<{
          date: string;
          listens: bigint;
          unique_tracks: bigint;
          unique_artists: bigint;
        }>
      >`
        SELECT 
          DATE(played_at) as date,
          COUNT(*)::int as listens,
          COUNT(DISTINCT track_id)::int as unique_tracks,
          COUNT(DISTINCT t.artist_id)::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l.track_id = t.id
        WHERE l.played_at >= ${startDate}
          AND l.played_at <= ${endDate}
        GROUP BY DATE(played_at)
        ORDER BY date ASC
      `;

  const result = await query;

  return result.map((row) => ({
    date: row.date,
    listens: Number(row.listens),
    uniqueTracks: Number(row.unique_tracks),
    uniqueArtists: Number(row.unique_artists),
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
  const where: any = {
    playedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    where.userId = userId;
  }

  // Get weekly aggregates using date_trunc
  const query = userId
    ? prisma.$queryRaw<
        Array<{
          week_start: Date;
          listens: bigint;
          unique_tracks: bigint;
          unique_artists: bigint;
        }>
      >`
        SELECT 
          DATE_TRUNC('week', played_at)::date as week_start,
          COUNT(*)::int as listens,
          COUNT(DISTINCT track_id)::int as unique_tracks,
          COUNT(DISTINCT t.artist_id)::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l.track_id = t.id
        WHERE l.played_at >= ${startDate}
          AND l.played_at <= ${endDate}
          AND l.user_id = ${userId}
        GROUP BY DATE_TRUNC('week', played_at)
        ORDER BY week_start ASC
      `
    : prisma.$queryRaw<
        Array<{
          week_start: Date;
          listens: bigint;
          unique_tracks: bigint;
          unique_artists: bigint;
        }>
      >`
        SELECT 
          DATE_TRUNC('week', played_at)::date as week_start,
          COUNT(*)::int as listens,
          COUNT(DISTINCT track_id)::int as unique_tracks,
          COUNT(DISTINCT t.artist_id)::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l.track_id = t.id
        WHERE l.played_at >= ${startDate}
          AND l.played_at <= ${endDate}
        GROUP BY DATE_TRUNC('week', played_at)
        ORDER BY week_start ASC
      `;

  const result = await query;

  // Get daily breakdown for each week
  const weeklyData: WeeklyListenDto[] = await Promise.all(
    result.map(async (row) => {
      const weekStart = new Date(row.week_start);
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
        listens: Number(row.listens),
        uniqueTracks: Number(row.unique_tracks),
        uniqueArtists: Number(row.unique_artists),
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
  const where: any = {
    playedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    where.userId = userId;
  }

  // Get monthly aggregates
  const query = userId
    ? prisma.$queryRaw<
        Array<{
          month: string;
          listens: bigint;
          unique_tracks: bigint;
          unique_artists: bigint;
        }>
      >`
        SELECT 
          TO_CHAR(played_at, 'YYYY-MM') as month,
          COUNT(*)::int as listens,
          COUNT(DISTINCT track_id)::int as unique_tracks,
          COUNT(DISTINCT t.artist_id)::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l.track_id = t.id
        WHERE l.played_at >= ${startDate}
          AND l.played_at <= ${endDate}
          AND l.user_id = ${userId}
        GROUP BY TO_CHAR(played_at, 'YYYY-MM')
        ORDER BY month ASC
      `
    : prisma.$queryRaw<
        Array<{
          month: string;
          listens: bigint;
          unique_tracks: bigint;
          unique_artists: bigint;
        }>
      >`
        SELECT 
          TO_CHAR(played_at, 'YYYY-MM') as month,
          COUNT(*)::int as listens,
          COUNT(DISTINCT track_id)::int as unique_tracks,
          COUNT(DISTINCT t.artist_id)::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l.track_id = t.id
        WHERE l.played_at >= ${startDate}
          AND l.played_at <= ${endDate}
        GROUP BY TO_CHAR(played_at, 'YYYY-MM')
        ORDER BY month ASC
      `;

  const result = await query;

  // Get daily breakdown for each month
  const monthlyData: MonthlyListenDto[] = await Promise.all(
    result.map(async (row) => {
      const [year, month] = row.month.split("-");
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0); // Last day of month

      const dailyBreakdown = await getDailyAggregatedListens(
        monthStart,
        monthEnd,
        userId
      );

      return {
        month: row.month,
        listens: Number(row.listens),
        uniqueTracks: Number(row.unique_tracks),
        uniqueArtists: Number(row.unique_artists),
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

