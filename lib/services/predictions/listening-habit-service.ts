/**
 * Listening habit prediction service.
 * Fetches historical data from DB and runs deterministic heuristics.
 * No ML - prediction is purely statistical.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transformBigIntToNumber } from "@/lib/dto/transformers";
import { ARTIST_TO_GENRE_MAP } from "@/lib/services/genre/genre-service";
import {
  computeListeningHabitPrediction,
  type HourDayGenreRow,
  MIN_LISTENS_FOR_PREDICTION,
} from "./listening-habit-heuristics";
import type {
  ListeningHabitResponse,
  ListeningHabitPrediction,
  InsufficientDataResponse,
} from "@/lib/dto/predictions";

/** Default lookback period in days */
const DEFAULT_LOOKBACK_DAYS = 90;

/**
 * Fetches raw listens aggregated by hour, day of week, and genre.
 * Uses track.genre with artist fallback (same as genre distribution).
 */
async function fetchHourDayGenreAggregation(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<{ rows: HourDayGenreRow[]; totalListens: number }> {
  const genreMapEntries = Object.entries(ARTIST_TO_GENRE_MAP);

  if (genreMapEntries.length === 0) {
    const query = Prisma.sql`
      SELECT 
        EXTRACT(HOUR FROM l."playedAt")::int as hour,
        EXTRACT(DOW FROM l."playedAt")::int as day_of_week,
        COALESCE(t.genre, 'Unknown') as genre,
        COUNT(*)::bigint as count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."playedAt" >= ${startDate}
        AND l."playedAt" <= ${endDate}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY EXTRACT(HOUR FROM l."playedAt"), EXTRACT(DOW FROM l."playedAt"), COALESCE(t.genre, 'Unknown')
      ORDER BY hour, day_of_week
    `;
    const result = await prisma.$queryRaw<
      Array<{
        hour: number;
        day_of_week: number;
        genre: string;
        count: bigint;
      }>
    >(query);
    const rows: HourDayGenreRow[] = result.map((row) => ({
      hour: row.hour,
      day_of_week: row.day_of_week,
      genre: row.genre,
      count: transformBigIntToNumber({ count: row.count }).count,
    }));
    const totalListens = rows.reduce((sum, r) => sum + r.count, 0);
    return { rows, totalListens };
  }

  const valuesParts = genreMapEntries.map(([artist, genre]) =>
    Prisma.sql`(${artist}, ${genre})`
  );

  const query = Prisma.sql`
    WITH genre_resolved AS (
      SELECT 
        EXTRACT(HOUR FROM l."playedAt")::int as hour,
        EXTRACT(DOW FROM l."playedAt")::int as day_of_week,
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
      hour,
      day_of_week,
      genre,
      COUNT(*)::bigint as count
    FROM genre_resolved
    GROUP BY hour, day_of_week, genre
    ORDER BY hour, day_of_week
  `;

  const result = await prisma.$queryRaw<
    Array<{
      hour: number;
      day_of_week: number;
      genre: string;
      count: bigint;
    }>
  >(query);

  const rows: HourDayGenreRow[] = result.map((row) => ({
    hour: row.hour,
    day_of_week: row.day_of_week,
    genre: row.genre,
    count: transformBigIntToNumber({ count: row.count }).count,
  }));

  const totalListens = rows.reduce((sum, r) => sum + r.count, 0);

  return { rows, totalListens };
}

/**
 * Computes "When Will I Listen?" prediction for today.
 *
 * @param userId - Optional user filter
 * @param lookbackDays - Days of history to analyze (default 90)
 * @returns Prediction or insufficient data response
 */
export async function getListeningHabitPrediction(
  userId?: string,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<ListeningHabitResponse> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const { rows, totalListens } = await fetchHourDayGenreAggregation(
    startDate,
    endDate,
    userId
  );

  if (totalListens < MIN_LISTENS_FOR_PREDICTION) {
    const response: InsufficientDataResponse = {
      insufficientData: true,
      minListensRecommended: MIN_LISTENS_FOR_PREDICTION,
      actualListens: totalListens,
      message: `Données insuffisantes pour une prédiction fiable. Au moins ${MIN_LISTENS_FOR_PREDICTION} écoutes recommandées.`,
    };
    return response;
  }

  const today = new Date();
  const targetDayOfWeek = today.getDay(); // 0 = Sunday

  const prediction = computeListeningHabitPrediction(
    rows,
    targetDayOfWeek,
    totalListens,
    lookbackDays,
    true
  );

  if (!prediction) {
    const response: InsufficientDataResponse = {
      insufficientData: true,
      minListensRecommended: MIN_LISTENS_FOR_PREDICTION,
      actualListens: totalListens,
      message:
        "Aucun pattern détecté pour ce jour de la semaine. Écoutez un peu plus pour affiner la prédiction.",
    };
    return response;
  }

  return prediction as ListeningHabitPrediction;
}
