/**
 * Taste Evolution Service - Fetches weekly aggregates from DB and computes trends.
 * Orchestrates taste-evolution-core (pure) with Prisma queries.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transformBigIntToNumber } from "@/lib/dto/transformers";
import { ARTIST_TO_GENRE_MAP } from "../genre/genre-service";
import {
  computeWeekToWeekTrend,
  getWeekEnd,
  type WeeklyAggregate,
} from "./taste-evolution-core";
import type { WeekToWeekTrend } from "@/lib/dto/taste-evolution";

/** Get list of week start dates (Monday, ISO) in range */
function getWeekStartsInRange(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const getMonday = (d: Date): Date => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return monday;
  };

  let monday = getMonday(start);
  const endMonday = getMonday(end);

  while (monday <= endMonday) {
    weeks.push(monday.toISOString().slice(0, 10));
    monday.setDate(monday.getDate() + 7);
  }

  return weeks;
}

/**
 * Fetch weekly aggregates for a single week from DB.
 */
async function fetchWeeklyAggregate(
  weekStart: string,
  userId?: string
): Promise<WeeklyAggregate> {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const genreMapEntries = Object.entries(ARTIST_TO_GENRE_MAP);

  let genreQuery: Prisma.Sql;
  if (genreMapEntries.length === 0) {
    genreQuery = Prisma.sql`
      SELECT COALESCE(t.genre, 'Unknown') as genre, COUNT(*)::bigint as count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."playedAt" >= ${start} AND l."playedAt" <= ${end}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY COALESCE(t.genre, 'Unknown')
    `;
  } else {
    const valuesParts = genreMapEntries.map(([artist, genre]) =>
      Prisma.sql`(${artist}, ${genre})`
    );
    genreQuery = Prisma.sql`
      SELECT COALESCE(t.genre, genre_map.genre, 'Unknown') as genre, COUNT(*)::bigint as count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      LEFT JOIN (VALUES ${Prisma.join(valuesParts)}) AS genre_map(artist_name, genre) ON a.name = genre_map.artist_name
      WHERE l."playedAt" >= ${start} AND l."playedAt" <= ${end}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY COALESCE(t.genre, genre_map.genre, 'Unknown')
    `;
  }

  const [countResult, genreResult, artistResult] = await Promise.all([
    prisma.$queryRaw<Array<{ listens: bigint; genres: bigint; artists: bigint }>>(
      Prisma.sql`
        SELECT
          COUNT(*)::bigint as listens,
          COUNT(DISTINCT COALESCE(t.genre, 'Unknown'))::bigint as genres,
          COUNT(DISTINCT t."artistId")::bigint as artists
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."playedAt" >= ${start} AND l."playedAt" <= ${end}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      `
    ),
    prisma.$queryRaw<Array<{ genre: string; count: bigint }>>(genreQuery),
    prisma.$queryRaw<
      Array<{ artist_name: string; listen_count: bigint }>
    >(
      Prisma.sql`
        SELECT a.name as artist_name, COUNT(*)::bigint as listen_count
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        JOIN "Artist" a ON t."artistId" = a.id
        WHERE l."playedAt" >= ${start} AND l."playedAt" <= ${end}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
        GROUP BY a.id, a.name
        ORDER BY listen_count DESC
        LIMIT 15
      `
    ),
  ]);

  const c = transformBigIntToNumber(
    countResult[0] ?? { listens: BigInt(0), genres: BigInt(0), artists: BigInt(0) }
  );
  const genreDistribution = genreResult.map((r) => ({
    genre: r.genre,
    count: transformBigIntToNumber({ count: r.count }).count,
  }));
  const topArtists = artistResult.map((r) => ({
    artistName: r.artist_name,
    listenCount: transformBigIntToNumber({ count: r.listen_count }).count,
  }));

  return {
    weekStart,
    weekEnd: getWeekEnd(weekStart),
    listens: c.listens ?? 0,
    uniqueGenres: c.genres ?? 0,
    uniqueArtists: c.artists ?? 0,
    genreDistribution,
    topArtists,
  };
}

/**
 * Fetch all weekly aggregates and compute week-to-week trends.
 */
export async function getTasteEvolutionTrends(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<{
  trends: WeekToWeekTrend[];
  skippedWeeks: Array<{ weekStart: string; reason: string }>;
}> {
  const weekStarts = getWeekStartsInRange(startDate, endDate);
  if (weekStarts.length < 2) {
    return {
      trends: [],
      skippedWeeks: weekStarts.map((ws) => ({
        weekStart: ws,
        reason: "Moins de 2 semaines dans la plage",
      })),
    };
  }

  const aggregates = await Promise.all(
    weekStarts.map((ws) => fetchWeeklyAggregate(ws, userId))
  );

  const trends: WeekToWeekTrend[] = [];
  const skippedWeeks: Array<{ weekStart: string; reason: string }> = [];

  for (let i = 1; i < aggregates.length; i++) {
    const prev = aggregates[i - 1];
    const curr = aggregates[i];
    const trend = computeWeekToWeekTrend(prev, curr);
    if (trend) {
      trends.push(trend);
    } else {
      skippedWeeks.push({
        weekStart: curr.weekStart,
        reason:
          prev.listens < 10
            ? `Semaine précédente: ${prev.listens} écoutes (< 10 min)`
            : `Semaine actuelle: ${curr.listens} écoutes (< 10 min)`,
      });
    }
  }

  return { trends, skippedWeeks };
}
