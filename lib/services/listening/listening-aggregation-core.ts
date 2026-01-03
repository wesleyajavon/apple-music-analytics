/**
 * Core SQL aggregation functions for date-based listening aggregations
 * Low-level utilities used by listening-aggregation.ts
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { transformBigIntToNumber } from "../../dto/transformers";

/**
 * Result type for date aggregations
 * The date field type varies by period: string for day/month, Date for week
 */
export interface AggregationResult {
  date: string | Date;
  listens: number;
  unique_tracks: number;
  unique_artists: number;
}

/**
 * Exécute une requête d'agrégation basée sur les dates.
 * 
 * Gère différents périodes (jour, semaine, mois) et un filtrage optionnel par utilisateur.
 * Utilise des agrégations SQL natives pour de meilleures performances.
 * 
 * @param startDate - Date de début de la plage d'agrégation
 * @param endDate - Date de fin de la plage d'agrégation
 * @param period - Type de période pour l'agrégation ('day', 'week', ou 'month')
 * @param userId - ID de l'utilisateur pour filtrer les écoutes (optionnel)
 * 
 * @returns Tableau de résultats d'agrégation avec la date, le nombre d'écoutes, titres uniques et artistes uniques
 * 
 * @example
 * ```typescript
 * const daily = await executeDateAggregation(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31'),
 *   'day',
 *   'user123'
 * );
 * // [{ date: '2024-01-01', listens: 50, unique_tracks: 30, unique_artists: 20 }, ...]
 * ```
 */
export async function executeDateAggregation(
  startDate: Date,
  endDate: Date,
  period: 'day' | 'week' | 'month',
  userId?: string
): Promise<AggregationResult[]> {
  // Determine the date expression based on period (using Prisma.raw for SQL expressions)
  const dateExpr = period === 'day' 
    ? Prisma.raw('DATE("playedAt")')
    : period === 'week'
    ? Prisma.raw("DATE_TRUNC('week', \"playedAt\")::date")
    : Prisma.raw("TO_CHAR(\"playedAt\", 'YYYY-MM')");
  
  // Build the query with conditional userId filter using Prisma.sql fragments
  const query = Prisma.sql`
    SELECT 
      ${dateExpr} as date,
      COUNT(*)::int as listens,
      COUNT(DISTINCT "trackId")::int as unique_tracks,
      COUNT(DISTINCT t."artistId")::int as unique_artists
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY ${dateExpr}
    ORDER BY date ASC
  `;

  const result = await prisma.$queryRaw<Array<{
    date: string | Date;
    listens: bigint;
    unique_tracks: bigint;
    unique_artists: bigint;
  }>>(query);

  // Convert bigint to number using centralized transformer
  return result.map((row) => ({
    date: row.date,
    ...transformBigIntToNumber({
      listens: row.listens,
      unique_tracks: row.unique_tracks,
      unique_artists: row.unique_artists,
    }),
  }));
}

