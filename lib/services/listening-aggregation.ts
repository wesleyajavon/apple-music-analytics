/**
 * Utility functions for date-based listening aggregations
 * Centralizes SQL aggregation logic to reduce duplication
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

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
 * Execute a date-based aggregation query
 * Handles different periods (day, week, month) and optional user filtering
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

  // Convert bigint to number and return
  return result.map((row) => ({
    date: row.date,
    listens: Number(row.listens),
    unique_tracks: Number(row.unique_tracks),
    unique_artists: Number(row.unique_artists),
  }));
}

