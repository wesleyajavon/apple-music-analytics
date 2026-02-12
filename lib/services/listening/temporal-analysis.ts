/**
 * Service pour l'analyse temporelle avancée des écoutes
 * Calcule les patterns d'écoute par jour de la semaine et par heure de la journée
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { transformBigIntToNumber } from "../../dto/transformers";

/**
 * Résultat d'agrégation par jour de la semaine
 * 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
 */
export interface DayOfWeekAggregation {
  dayOfWeek: number; // 0-6 (0 = dimanche, 1 = lundi, etc.)
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
}

/**
 * Résultat d'agrégation par heure de la journée
 * 0-23 (0 = minuit, 23 = 23h)
 */
export interface HourOfDayAggregation {
  hour: number; // 0-23
  listens: number;
  uniqueTracks: number;
  uniqueArtists: number;
}

/**
 * Résultat complet de l'analyse temporelle
 */
export interface TemporalAnalysisResult {
  byDayOfWeek: DayOfWeekAggregation[];
  byHourOfDay: HourOfDayAggregation[];
  peakDay: DayOfWeekAggregation | null;
  peakHour: HourOfDayAggregation | null;
}

/**
 * Récupère les écoutes agrégées par jour de la semaine
 */
async function getListensByDayOfWeek(
  startDate: Date | undefined,
  endDate: Date | undefined,
  userId?: string
): Promise<DayOfWeekAggregation[]> {
  const query = Prisma.sql`
    SELECT 
      EXTRACT(DOW FROM "playedAt")::int as day_of_week,
      COUNT(*)::bigint as listens,
      COUNT(DISTINCT "trackId")::bigint as unique_tracks,
      COUNT(DISTINCT t."artistId")::bigint as unique_artists
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY day_of_week
    ORDER BY day_of_week ASC
  `;

  const result = await prisma.$queryRaw<Array<{
    day_of_week: number;
    listens: bigint;
    unique_tracks: bigint;
    unique_artists: bigint;
  }>>(query);

  // Convertir bigint en number et formater les résultats
  const aggregations = result.map((row) => ({
    dayOfWeek: row.day_of_week,
    ...transformBigIntToNumber({
      listens: row.listens,
      uniqueTracks: row.unique_tracks,
      uniqueArtists: row.unique_artists,
    }),
  }));

  // S'assurer que tous les jours de la semaine sont présents (même avec 0 écoutes)
  const dayMap = new Map(aggregations.map((a) => [a.dayOfWeek, a]));
  const completeAggregations: DayOfWeekAggregation[] = [];

  for (let i = 0; i < 7; i++) {
    const existing = dayMap.get(i);
    if (existing) {
      completeAggregations.push(existing);
    } else {
      completeAggregations.push({
        dayOfWeek: i,
        listens: 0,
        uniqueTracks: 0,
        uniqueArtists: 0,
      });
    }
  }

  // Réorganiser pour commencer par lundi (1) au lieu de dimanche (0)
  // Format: [Lundi, Mardi, ..., Dimanche]
  const mondayFirst = [
    ...completeAggregations.slice(1), // Mardi à Dimanche
    completeAggregations[0], // Dimanche à la fin
  ];

  return mondayFirst;
}

/**
 * Récupère les écoutes agrégées par heure de la journée
 */
async function getListensByHourOfDay(
  startDate: Date | undefined,
  endDate: Date | undefined,
  userId?: string
): Promise<HourOfDayAggregation[]> {
  const query = Prisma.sql`
    SELECT 
      EXTRACT(HOUR FROM "playedAt")::int as hour,
      COUNT(*)::bigint as listens,
      COUNT(DISTINCT "trackId")::bigint as unique_tracks,
      COUNT(DISTINCT t."artistId")::bigint as unique_artists
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY hour
    ORDER BY hour ASC
  `;

  const result = await prisma.$queryRaw<Array<{
    hour: number;
    listens: bigint;
    unique_tracks: bigint;
    unique_artists: bigint;
  }>>(query);

  // Convertir bigint en number et formater les résultats
  const aggregations = result.map((row) => ({
    hour: row.hour,
    ...transformBigIntToNumber({
      listens: row.listens,
      uniqueTracks: row.unique_tracks,
      uniqueArtists: row.unique_artists,
    }),
  }));

  // S'assurer que toutes les heures sont présentes (même avec 0 écoutes)
  const hourMap = new Map(aggregations.map((a) => [a.hour, a]));
  const completeAggregations: HourOfDayAggregation[] = [];

  for (let i = 0; i < 24; i++) {
    const existing = hourMap.get(i);
    if (existing) {
      completeAggregations.push(existing);
    } else {
      completeAggregations.push({
        hour: i,
        listens: 0,
        uniqueTracks: 0,
        uniqueArtists: 0,
      });
    }
  }

  return completeAggregations;
}

/**
 * Calcule l'analyse temporelle complète des écoutes
 * 
 * @param startDate - Date de début de la plage d'analyse (optionnel, si non fourni utilise toutes les données)
 * @param endDate - Date de fin de la plage d'analyse (optionnel, si non fourni utilise toutes les données)
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Résultat complet avec agrégations par jour de semaine et par heure, plus les moments de pic
 */
export async function getTemporalAnalysis(
  startDate: Date | undefined,
  endDate: Date | undefined,
  userId?: string
): Promise<TemporalAnalysisResult> {
  const [byDayOfWeek, byHourOfDay] = await Promise.all([
    getListensByDayOfWeek(startDate, endDate, userId),
    getListensByHourOfDay(startDate, endDate, userId),
  ]);

  // Identifier le jour de pic (celui avec le plus d'écoutes)
  // Retourne null si toutes les valeurs sont à 0
  const peakDay =
    byDayOfWeek.length > 0
      ? (() => {
          const maxDay = byDayOfWeek.reduce((max, day) =>
            day.listens > max.listens ? day : max
          );
          return maxDay.listens > 0 ? maxDay : null;
        })()
      : null;

  // Identifier l'heure de pic (celle avec le plus d'écoutes)
  // Retourne null si toutes les valeurs sont à 0
  const peakHour =
    byHourOfDay.length > 0
      ? (() => {
          const maxHour = byHourOfDay.reduce((max, hour) =>
            hour.listens > max.listens ? hour : max
          );
          return maxHour.listens > 0 ? maxHour : null;
        })()
      : null;

  return {
    byDayOfWeek,
    byHourOfDay,
    peakDay,
    peakHour,
  };
}
