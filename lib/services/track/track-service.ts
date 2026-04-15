import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transformBigIntToNumber } from "@/lib/dto/transformers";
import type { TrackTrendsChartTrack } from "@/lib/dto/track";

export interface TrackStats {
  trackId: string;
  trackTitle: string;
  artistId: string;
  artistName: string;
  genre: string | null;
  listenCount: number;
  firstListenDate: string;
  lastListenDate: string;
  totalPlayTime: number;
}

export async function getTrackStats(
  startDate: Date | undefined,
  endDate: Date | undefined,
  userId: string | undefined,
  limit = 20,
  offset = 0
): Promise<TrackStats[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);

  const query = Prisma.sql`
    SELECT
      t.id as track_id,
      t.title as track_title,
      a.id as artist_id,
      a.name as artist_name,
      t.genre as genre,
      COUNT(*)::bigint as listen_count,
      MIN(l."playedAt") as first_listen_date,
      MAX(l."playedAt") as last_listen_date,
      COALESCE(SUM(t.duration), 0)::bigint as total_play_time
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY t.id, t.title, a.id, a.name, t.genre
    ORDER BY listen_count DESC, t.title ASC
    LIMIT ${safeLimit}
    OFFSET ${safeOffset}
  `;

  const result = await prisma.$queryRaw<
    Array<{
      track_id: string;
      track_title: string;
      artist_id: string;
      artist_name: string;
      genre: string | null;
      listen_count: bigint;
      first_listen_date: Date;
      last_listen_date: Date;
      total_play_time: bigint;
    }>
  >(query);

  return result.map((row) => {
    const transformed = transformBigIntToNumber({
      listen_count: row.listen_count,
      total_play_time: row.total_play_time,
    });
    return {
      trackId: row.track_id,
      trackTitle: row.track_title,
      artistId: row.artist_id,
      artistName: row.artist_name,
      genre: row.genre,
      listenCount: transformed.listen_count,
      firstListenDate: row.first_listen_date.toISOString(),
      lastListenDate: row.last_listen_date.toISOString(),
      totalPlayTime: transformed.total_play_time,
    };
  });
}

export async function countTracksForRange(
  startDate: Date | undefined,
  endDate: Date | undefined,
  userId: string | undefined
): Promise<number> {
  const query = Prisma.sql`
    SELECT COUNT(*)::int as total
    FROM (
      SELECT t.id
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE 1=1
        ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
        ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY t.id
    ) s
  `;
  const rows = await prisma.$queryRaw<Array<{ total: number }>>(query);
  return rows[0]?.total ?? 0;
}

export async function searchTracksByName(
  query: string,
  limit = 25
): Promise<TrackTrendsChartTrack[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const take = Math.min(Math.max(limit, 1), 50);

  const rows = await prisma.track.findMany({
    where: {
      OR: [
        { titleLower: { contains: q } },
        { artist: { nameLower: { contains: q } } },
      ],
    },
    take,
    orderBy: [{ title: "asc" }, { artist: { name: "asc" } }],
    select: {
      id: true,
      title: true,
      artist: { select: { name: true } },
    },
  });

  return rows.map((r) => ({ id: r.id, title: r.title, artistName: r.artist.name }));
}

export interface TrackTrendChartRow {
  date: string;
  trackId: string;
  trackTitle: string;
  artistName: string;
  count: number;
}

function getTrendDateExpr(period: "day" | "week" | "month"): Prisma.Sql {
  if (period === "day") return Prisma.raw('DATE(l."playedAt")');
  if (period === "week") return Prisma.raw('DATE_TRUNC(\'week\', l."playedAt")::date');
  return Prisma.raw('TO_CHAR(l."playedAt", \'YYYY-MM\')');
}

export async function getTrackTrendsChartRows(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId?: string,
  topN = 20
): Promise<TrackTrendChartRow[]> {
  const n = Math.min(Math.max(topN, 1), 50);
  const dateExpr = getTrendDateExpr(period);

  const topTracks = await prisma.$queryRaw<Array<{ track_id: string }>>(Prisma.sql`
    SELECT t.id as track_id
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY t.id
    ORDER BY COUNT(*) DESC
    LIMIT ${n}
  `);

  if (topTracks.length === 0) return [];
  const ids = Prisma.join(topTracks.map((r) => Prisma.sql`${r.track_id}`));

  const rows = await prisma.$queryRaw<
    Array<{
      date: string | Date;
      track_id: string;
      track_title: string;
      artist_name: string;
      listen_count: bigint;
    }>
  >(Prisma.sql`
    SELECT
      ${dateExpr}::text as date,
      t.id as track_id,
      t.title as track_title,
      a.name as artist_name,
      COUNT(*)::bigint as listen_count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      AND t.id IN (${ids})
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY ${dateExpr}, t.id, t.title, a.name
    ORDER BY ${dateExpr} ASC, listen_count DESC
  `);

  return rows.map((row) => ({
    date: normalizeTrendDate(row.date, period),
    trackId: row.track_id,
    trackTitle: row.track_title,
    artistName: row.artist_name,
    count: transformBigIntToNumber({ count: row.listen_count }).count,
  }));
}

export async function getTrackTrendsChartRowsForTrackIds(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId: string | undefined,
  trackIds: string[]
): Promise<TrackTrendChartRow[]> {
  const uniqueIds = [...new Set(trackIds)].slice(0, 50);
  if (uniqueIds.length === 0) return [];
  const dateExpr = getTrendDateExpr(period);
  const idsSql = Prisma.join(uniqueIds.map((id) => Prisma.sql`${id}`));

  const rows = await prisma.$queryRaw<
    Array<{
      date: string | Date;
      track_id: string;
      track_title: string;
      artist_name: string;
      listen_count: bigint;
    }>
  >(Prisma.sql`
    SELECT
      ${dateExpr}::text as date,
      t.id as track_id,
      t.title as track_title,
      a.name as artist_name,
      COUNT(*)::bigint as listen_count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      AND t.id IN (${idsSql})
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY ${dateExpr}, t.id, t.title, a.name
    ORDER BY ${dateExpr} ASC, listen_count DESC
  `);

  return rows.map((row) => ({
    date: normalizeTrendDate(row.date, period),
    trackId: row.track_id,
    trackTitle: row.track_title,
    artistName: row.artist_name,
    count: transformBigIntToNumber({ count: row.listen_count }).count,
  }));
}

export async function getTopTrackCatalogForRange(
  startDate: Date,
  endDate: Date,
  userId: string | undefined,
  topN = 20
): Promise<TrackTrendsChartTrack[]> {
  const n = Math.min(Math.max(topN, 1), 50);
  const rows = await prisma.$queryRaw<
    Array<{ track_id: string; track_title: string; artist_name: string }>
  >(Prisma.sql`
    SELECT
      t.id as track_id,
      t.title as track_title,
      a.name as artist_name
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY t.id, t.title, a.name
    ORDER BY COUNT(*) DESC
    LIMIT ${n}
  `);

  return rows.map((r) => ({ id: r.track_id, title: r.track_title, artistName: r.artist_name }));
}

export async function resolveTracksByIds(
  orderedIds: string[]
): Promise<TrackTrendsChartTrack[]> {
  if (orderedIds.length === 0) return [];
  const rows = await prisma.track.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, title: true, artist: { select: { name: true } } },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return orderedIds.map((id) => {
    const row = byId.get(id);
    if (!row) return { id, title: "Unknown", artistName: "Unknown" };
    return { id: row.id, title: row.title, artistName: row.artist.name };
  });
}

export async function getTrackOverview(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<{
  totalTracks: number;
  totalListens: number;
  averageListensPerTrack: number;
  topTrackListenCount: number;
}> {
  const query = Prisma.sql`
    WITH track_stats AS (
      SELECT
        t.id as track_id,
        COUNT(*)::int as listen_count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE 1=1
        ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
        ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY t.id
    )
    SELECT
      COUNT(*)::int as total_tracks,
      SUM(listen_count)::bigint as total_listens,
      AVG(listen_count)::numeric as avg_listens_per_track,
      MAX(listen_count)::int as top_track_listen_count
    FROM track_stats
  `;

  const result = await prisma.$queryRaw<
    Array<{
      total_tracks: number;
      total_listens: bigint;
      avg_listens_per_track: number;
      top_track_listen_count: number;
    }>
  >(query);

  const row = result[0];
  if (!row) {
    return {
      totalTracks: 0,
      totalListens: 0,
      averageListensPerTrack: 0,
      topTrackListenCount: 0,
    };
  }

  const transformed = transformBigIntToNumber({ total_listens: row.total_listens });
  return {
    totalTracks: row.total_tracks,
    totalListens: transformed.total_listens,
    averageListensPerTrack: Math.round(row.avg_listens_per_track),
    topTrackListenCount: row.top_track_listen_count,
  };
}

function normalizeTrendDate(
  value: string | Date,
  period: "day" | "week" | "month"
): string {
  if (typeof value === "string") return value;
  const d = new Date(value);
  if (period === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 10);
}
