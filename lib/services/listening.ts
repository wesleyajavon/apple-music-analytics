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
          DATE("playedAt") as date,
          COUNT(*)::int as listens,
          COUNT(DISTINCT "trackId")::int as unique_tracks,
          COUNT(DISTINCT t."artistId")::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${startDate}
          AND l."playedAt" <= ${endDate}
          AND l."userId" = ${userId}
        GROUP BY DATE("playedAt")
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
          DATE("playedAt") as date,
          COUNT(*)::int as listens,
          COUNT(DISTINCT "trackId")::int as unique_tracks,
          COUNT(DISTINCT t."artistId")::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${startDate}
          AND l."playedAt" <= ${endDate}
        GROUP BY DATE("playedAt")
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
          DATE_TRUNC('week', "playedAt")::date as week_start,
          COUNT(*)::int as listens,
          COUNT(DISTINCT "trackId")::int as unique_tracks,
          COUNT(DISTINCT t."artistId")::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${startDate}
          AND l."playedAt" <= ${endDate}
          AND l."userId" = ${userId}
        GROUP BY DATE_TRUNC('week', "playedAt")
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
          DATE_TRUNC('week', "playedAt")::date as week_start,
          COUNT(*)::int as listens,
          COUNT(DISTINCT "trackId")::int as unique_tracks,
          COUNT(DISTINCT t."artistId")::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${startDate}
          AND l."playedAt" <= ${endDate}
        GROUP BY DATE_TRUNC('week', "playedAt")
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
          TO_CHAR("playedAt", 'YYYY-MM') as month,
          COUNT(*)::int as listens,
          COUNT(DISTINCT "trackId")::int as unique_tracks,
          COUNT(DISTINCT t."artistId")::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${startDate}
          AND l."playedAt" <= ${endDate}
          AND l."userId" = ${userId}
        GROUP BY TO_CHAR("playedAt", 'YYYY-MM')
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
          TO_CHAR("playedAt", 'YYYY-MM') as month,
          COUNT(*)::int as listens,
          COUNT(DISTINCT "trackId")::int as unique_tracks,
          COUNT(DISTINCT t."artistId")::int as unique_artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${startDate}
          AND l."playedAt" <= ${endDate}
        GROUP BY TO_CHAR("playedAt", 'YYYY-MM')
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

/**
 * Mapping simplifié des artistes vers les genres
 * À remplacer par une vraie API de genres (Last.fm, MusicBrainz, etc.) dans le futur
 */
const ARTIST_TO_GENRE_MAP: Record<string, string> = {
  "The Weeknd": "R&B",
  "Dua Lipa": "Pop",
  "Taylor Swift": "Pop",
  "Arctic Monkeys": "Indie Rock",
  "Kendrick Lamar": "Hip-Hop",
  "Daft Punk": "Electronic",
  "Bon Iver": "Indie Folk",
  "Beach House": "Dream Pop",
  // Ajoutez plus de mappings selon vos besoins
};

/**
 * Fonction helper pour obtenir le genre d'un artiste
 * Retourne "Unknown" si l'artiste n'est pas dans le mapping
 */
function getGenreForArtist(artistName: string): string {
  return ARTIST_TO_GENRE_MAP[artistName] || "Unknown";
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

