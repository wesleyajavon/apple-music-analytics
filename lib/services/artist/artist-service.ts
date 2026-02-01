/**
 * Service layer for artist statistics
 * Handles artist-related data aggregation and analysis
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { transformBigIntToNumber } from "../../dto/transformers";

export interface ArtistStats {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  listenCount: number;
  uniqueTracks: number;
  firstListenDate: string;
  lastListenDate: string;
  totalPlayTime: number; // in seconds
}

export interface ArtistTrendPoint {
  date: string;
  artistName: string;
  listenCount: number;
}

/**
 * Récupère les statistiques détaillées des artistes les plus écoutés
 * 
 * @param startDate - Date de début pour filtrer les écoutes (optionnel)
 * @param endDate - Date de fin pour filtrer les écoutes (optionnel)
 * @param userId - ID de l'utilisateur pour filtrer les écoutes (optionnel)
 * @param limit - Nombre maximum d'artistes à retourner (par défaut: 20)
 * 
 * @returns Tableau d'artistes avec statistiques détaillées
 */
export async function getArtistStats(
  startDate?: Date,
  endDate?: Date,
  userId?: string,
  limit: number = 20
): Promise<ArtistStats[]> {
  const query = Prisma.sql`
    SELECT 
      a.id as artist_id,
      a.name as artist_name,
      a."imageUrl" as image_url,
      COUNT(*)::bigint as listen_count,
      COUNT(DISTINCT t.id)::bigint as unique_tracks,
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
    GROUP BY a.id, a.name, a."imageUrl"
    ORDER BY listen_count DESC
    LIMIT ${limit}
  `;

  const result = await prisma.$queryRaw<Array<{
    artist_id: string;
    artist_name: string;
    image_url: string | null;
    listen_count: bigint;
    unique_tracks: bigint;
    first_listen_date: Date;
    last_listen_date: Date;
    total_play_time: bigint;
  }>>(query);

  return result.map(row => {
    const transformed = transformBigIntToNumber({
      listen_count: row.listen_count,
      unique_tracks: row.unique_tracks,
      total_play_time: row.total_play_time,
    });

    return {
      artistId: row.artist_id,
      artistName: row.artist_name,
      imageUrl: row.image_url,
      listenCount: transformed.listen_count,
      uniqueTracks: transformed.unique_tracks,
      firstListenDate: row.first_listen_date.toISOString(),
      lastListenDate: row.last_listen_date.toISOString(),
      totalPlayTime: transformed.total_play_time,
    };
  });
}

/**
 * Récupère l'évolution des écoutes pour les top artistes dans le temps
 * 
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @param period - Période d'agrégation (day, week, month)
 * @param userId - ID de l'utilisateur (optionnel)
 * @param topN - Nombre d'artistes à inclure (par défaut: 5)
 * 
 * @returns Tableau de points de données pour chaque artiste dans le temps
 */
export async function getArtistTrends(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId?: string,
  topN: number = 5
): Promise<ArtistTrendPoint[]> {
  // Déterminer l'expression de date selon la période
  const dateExpr =
    period === "day"
      ? Prisma.raw('DATE(l."playedAt")')
      : period === "week"
        ? Prisma.raw('DATE_TRUNC(\'week\', l."playedAt")::date')
        : Prisma.raw('TO_CHAR(l."playedAt", \'YYYY-MM\')');

  // D'abord, récupérer les top N artistes pour la période
  const topArtistsQuery = Prisma.sql`
    SELECT a.id as artist_id, a.name as artist_name
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY a.id, a.name
    ORDER BY COUNT(*) DESC
    LIMIT ${topN}
  `;

  const topArtists = await prisma.$queryRaw<Array<{
    artist_id: string;
    artist_name: string;
  }>>(topArtistsQuery);

  if (topArtists.length === 0) {
    return [];
  }

  // Ensuite, récupérer les tendances pour ces artistes
  const artistIds = topArtists.map(a => a.artist_id);
  const artistIdsArray = Prisma.join(artistIds.map(id => Prisma.sql`${id}`));

  const trendsQuery = Prisma.sql`
    SELECT 
      ${dateExpr}::text as date,
      a.name as artist_name,
      COUNT(*)::int as listen_count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      AND a.id IN (${artistIdsArray})
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY ${dateExpr}, a.name
    ORDER BY ${dateExpr} ASC, listen_count DESC
  `;

  const result = await prisma.$queryRaw<Array<{
    date: string | Date;
    artist_name: string;
    listen_count: bigint;
  }>>(trendsQuery);

  return result.map(row => ({
    date: normalizeTrendDate(row.date, period),
    artistName: row.artist_name,
    listenCount: transformBigIntToNumber({ count: row.listen_count }).count,
  }));
}

/**
 * Récupère les statistiques globales sur les artistes
 * 
 * @param startDate - Date de début (optionnel)
 * @param endDate - Date de fin (optionnel)
 * @param userId - ID de l'utilisateur (optionnel)
 * 
 * @returns Statistiques globales sur les artistes
 */
export async function getArtistOverview(
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<{
  totalArtists: number;
  totalListens: number;
  averageListensPerArtist: number;
  topArtistListenCount: number;
}> {
  const query = Prisma.sql`
    WITH artist_stats AS (
      SELECT 
        a.id as artist_id,
        COUNT(*)::int as listen_count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE 1=1
        ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
        ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
      GROUP BY a.id
    )
    SELECT 
      COUNT(*)::int as total_artists,
      SUM(listen_count)::bigint as total_listens,
      AVG(listen_count)::numeric as avg_listens_per_artist,
      MAX(listen_count)::int as top_artist_listen_count
    FROM artist_stats
  `;

  const result = await prisma.$queryRaw<Array<{
    total_artists: number;
    total_listens: bigint;
    avg_listens_per_artist: number;
    top_artist_listen_count: number;
  }>>(query);

  const row = result[0];
  if (!row) {
    return {
      totalArtists: 0,
      totalListens: 0,
      averageListensPerArtist: 0,
      topArtistListenCount: 0,
    };
  }

  const transformed = transformBigIntToNumber({
    total_listens: row.total_listens,
  });

  return {
    totalArtists: row.total_artists,
    totalListens: transformed.total_listens,
    averageListensPerArtist: Math.round(row.avg_listens_per_artist),
    topArtistListenCount: row.top_artist_listen_count,
  };
}

function normalizeTrendDate(
  value: string | Date,
  period: "day" | "week" | "month"
): string {
  if (typeof value === "string") {
    return value;
  }
  const d = new Date(value);
  if (period === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return d.toISOString().slice(0, 10);
}
