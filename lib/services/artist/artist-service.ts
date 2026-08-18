/**
 * Service layer for artist statistics
 * Handles artist-related data aggregation and analysis
 */

import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { transformBigIntToNumber } from "../../dto/transformers";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";

export interface ArtistStats {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  listenCount: number;
  uniqueTracks: number;
  firstListenDate: string;
  lastListenDate: string;
  totalPlayTime: number; // in seconds
  /** Rang global sur la période (présent quand une recherche filtre la liste). */
  rank?: number;
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
  limit: number = 20,
  offset: number = 0,
  searchQuery?: string
): Promise<ArtistStats[]> {
  const normalizedSearch = searchQuery?.trim().toLowerCase() ?? "";
  const namePattern =
    normalizedSearch.length > 0
      ? `%${escapeLikePattern(normalizedSearch)}%`
      : null;

  const listenFilters = Prisma.sql`
    WHERE 1=1
      ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
      ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
  `;

  const query = namePattern
    ? Prisma.sql`
        WITH ranked AS (
          SELECT
            a.id as artist_id,
            a.name as artist_name,
            a."nameLower" as name_lower,
            a."imageUrl" as image_url,
            COUNT(*)::bigint as listen_count,
            COUNT(DISTINCT t.id)::bigint as unique_tracks,
            MIN(l."playedAt") as first_listen_date,
            MAX(l."playedAt") as last_listen_date,
            COALESCE(SUM(t.duration), 0)::bigint as total_play_time,
            ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, a.name ASC) as rank
          FROM "Listen" l
          JOIN "Track" t ON l."trackId" = t.id
          JOIN "Artist" a ON t."artistId" = a.id
          ${listenFilters}
          GROUP BY a.id, a.name, a."nameLower", a."imageUrl"
        )
        SELECT
          artist_id,
          artist_name,
          image_url,
          listen_count,
          unique_tracks,
          first_listen_date,
          last_listen_date,
          total_play_time,
          rank
        FROM ranked
        WHERE name_lower LIKE ${namePattern} ESCAPE ${"\\"}
        ORDER BY listen_count DESC, artist_name ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    : Prisma.sql`
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
        ${listenFilters}
        GROUP BY a.id, a.name, a."imageUrl"
        ORDER BY listen_count DESC
        LIMIT ${limit}
        OFFSET ${offset}
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
    rank?: bigint | number;
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
      ...(row.rank != null ? { rank: Number(row.rank) } : {}),
    };
  });
}

export async function countArtistsForRange(
  startDate?: Date,
  endDate?: Date,
  userId?: string,
  searchQuery?: string
): Promise<number> {
  const normalizedSearch = searchQuery?.trim().toLowerCase() ?? "";
  const namePattern =
    normalizedSearch.length > 0
      ? `%${escapeLikePattern(normalizedSearch)}%`
      : null;

  const query = Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM (
      SELECT a.id
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE 1=1
        ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
        ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
        ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
        ${namePattern ? Prisma.sql`AND a."nameLower" LIKE ${namePattern} ESCAPE ${"\\"}` : Prisma.sql``}
      GROUP BY a.id
    ) counted
  `;

  const result = await prisma.$queryRaw<Array<{ total: bigint }>>(query);
  return Number(result[0]?.total ?? BigInt(0));
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

export interface ArtistTrendChartRow {
  date: string;
  artistId: string;
  artistName: string;
  count: number;
}

/**
 * Lignes brutes pour graphique multi-lignes (top N artistes de la période, par bucket temporel).
 * Utilisé par `/api/artists/trends-chart` (format pivot côté route).
 */
export async function getArtistTrendsChartRows(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId?: string,
  topN: number = 30
): Promise<ArtistTrendChartRow[]> {
  const clampedTop = Math.min(Math.max(topN, 1), 50);

  const dateExpr =
    period === "day"
      ? Prisma.raw('DATE(l."playedAt")')
      : period === "week"
        ? Prisma.raw('DATE_TRUNC(\'week\', l."playedAt")::date')
        : Prisma.raw('TO_CHAR(l."playedAt", \'YYYY-MM\')');

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
    LIMIT ${clampedTop}
  `;

  const topArtists = await prisma.$queryRaw<Array<{
    artist_id: string;
    artist_name: string;
  }>>(topArtistsQuery);

  if (topArtists.length === 0) {
    return [];
  }

  const artistIds = topArtists.map((a) => a.artist_id);
  const artistIdsArray = Prisma.join(artistIds.map((id) => Prisma.sql`${id}`));

  const trendsQuery = Prisma.sql`
    SELECT 
      ${dateExpr}::text as date,
      a.id as artist_id,
      a.name as artist_name,
      COUNT(*)::int as listen_count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      AND a.id IN (${artistIdsArray})
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY ${dateExpr}, a.id, a.name
    ORDER BY ${dateExpr} ASC, listen_count DESC
  `;

  const result = await prisma.$queryRaw<Array<{
    date: string | Date;
    artist_id: string;
    artist_name: string;
    listen_count: bigint;
  }>>(trendsQuery);

  return result.map((row) => ({
    date: normalizeTrendDate(row.date, period),
    artistId: row.artist_id,
    artistName: row.artist_name,
    count: transformBigIntToNumber({ count: row.listen_count }).count,
  }));
}

const MAX_TREND_SERIES = 50;

/**
 * Tendances pour une liste d’artistes explicite (pas limitée au top N de la période).
 */
export async function getArtistTrendsChartRowsForArtistIds(
  startDate: Date,
  endDate: Date,
  period: "day" | "week" | "month",
  userId: string | undefined,
  artistIds: string[]
): Promise<ArtistTrendChartRow[]> {
  const unique = [...new Set(artistIds)].slice(0, MAX_TREND_SERIES);
  if (unique.length === 0) return [];

  const dateExpr =
    period === "day"
      ? Prisma.raw('DATE(l."playedAt")')
      : period === "week"
        ? Prisma.raw('DATE_TRUNC(\'week\', l."playedAt")::date')
        : Prisma.raw('TO_CHAR(l."playedAt", \'YYYY-MM\')');

  const idsSql = Prisma.join(unique.map((id) => Prisma.sql`${id}`));

  const trendsQuery = Prisma.sql`
    SELECT 
      ${dateExpr}::text as date,
      a.id as artist_id,
      a.name as artist_name,
      COUNT(*)::int as listen_count
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
      AND a.id IN (${idsSql})
      ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
    GROUP BY ${dateExpr}, a.id, a.name
    ORDER BY ${dateExpr} ASC, listen_count DESC
  `;

  const result = await prisma.$queryRaw<Array<{
    date: string | Date;
    artist_id: string;
    artist_name: string;
    listen_count: bigint;
  }>>(trendsQuery);

  return result.map((row) => ({
    date: normalizeTrendDate(row.date, period),
    artistId: row.artist_id,
    artistName: row.artist_name,
    count: transformBigIntToNumber({ count: row.listen_count }).count,
  }));
}

/**
 * Top artistes (id + nom) sur la période — pour alimenter le picker sans recharger toute la série.
 */
export async function getTopArtistCatalogForRange(
  startDate: Date,
  endDate: Date,
  userId: string | undefined,
  topN: number = 30
): Promise<ArtistTrendsChartArtist[]> {
  const n = Math.min(Math.max(topN, 1), 50);

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
    LIMIT ${n}
  `;

  const topArtists = await prisma.$queryRaw<Array<{
    artist_id: string;
    artist_name: string;
  }>>(topArtistsQuery);

  return topArtists.map((a) => ({ id: a.artist_id, name: a.artist_name }));
}

/** Cap for catalog name search (featuring credits can explode the match set). */
export const ARTIST_SEARCH_MAX_RESULTS = 100;

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Recherche dans le catalogue Artist (nameLower indexé).
 * Les correspondances exactes et préfixe passent avant les featurings
 * (ex. « Drake » n’est pas noyé sous « 21 Savage, Drake »).
 */
export async function searchArtistsByName(
  query: string,
  limit: number = ARTIST_SEARCH_MAX_RESULTS
): Promise<ArtistTrendsChartArtist[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const take = Math.min(Math.max(limit, 1), ARTIST_SEARCH_MAX_RESULTS);
  const escaped = escapeLikePattern(q);
  const containsPattern = `%${escaped}%`;
  const prefixPattern = `${escaped}%`;

  const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`
    SELECT a.id, a.name
    FROM "Artist" a
    WHERE a."nameLower" LIKE ${containsPattern} ESCAPE ${"\\"}
    ORDER BY
      CASE
        WHEN a."nameLower" = ${q} THEN 0
        WHEN a."nameLower" LIKE ${prefixPattern} ESCAPE ${"\\"} THEN 1
        ELSE 2
      END ASC,
      a.name ASC
    LIMIT ${take}
  `);

  return rows.map((r) => ({ id: r.id, name: r.name }));
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

export interface ArtistUserInsights {
  artist: ArtistStats;
  topTracks: { trackId: string; title: string; listenCount: number }[];
  listensByHour: { hour: number; listens: number }[];
  listensByWeekday: { weekdayIndexMondayFirst: number; listens: number }[];
  listensBySource: { source: string; listens: number }[];
  busiestDay: { date: string; listens: number } | null;
  activeListeningDays: number;
  listeningSpanDays: number;
  peakListenHour: { hour: number; listens: number } | null;
  peakWeekday: { weekdayIndexMondayFirst: number; listens: number } | null;
}

const dowPgToMondayFirst = (pgDow: number) => (pgDow === 0 ? 6 : pgDow - 1);

/**
 * Agrégats « votre relation avec cet artiste » : tops morceaux, rythmes, sources,
 * jour le plus dense. Retourne null si aucune écoute dans la fenêtre ou artiste inconnu.
 */
export async function getArtistUserInsights(
  artistId: string,
  startDate?: Date,
  endDate?: Date,
  userId?: string
): Promise<ArtistUserInsights | null> {
  const filters = Prisma.sql`
    AND t."artistId" = ${artistId}
    ${startDate ? Prisma.sql`AND l."playedAt" >= ${startDate}` : Prisma.sql``}
    ${endDate ? Prisma.sql`AND l."playedAt" <= ${endDate}` : Prisma.sql``}
    ${userId ? Prisma.sql`AND l."userId" = ${userId}` : Prisma.sql``}
  `;

  const [summaryRows, topTracksRows, hourRows, dowRows, sourceRows, busiestRows, distinctDaysRows] =
    await Promise.all([
      prisma.$queryRaw<
        Array<{
          artist_id: string;
          artist_name: string;
          image_url: string | null;
          listen_count: bigint;
          unique_tracks: bigint;
          first_listen_date: Date;
          last_listen_date: Date;
          total_play_time: bigint;
        }>
      >(Prisma.sql`
        SELECT
          a.id AS artist_id,
          a.name AS artist_name,
          a."imageUrl" AS image_url,
          COUNT(*)::bigint AS listen_count,
          COUNT(DISTINCT t.id)::bigint AS unique_tracks,
          MIN(l."playedAt") AS first_listen_date,
          MAX(l."playedAt") AS last_listen_date,
          COALESCE(SUM(t.duration), 0)::bigint AS total_play_time
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        JOIN "Artist" a ON t."artistId" = a.id
        WHERE 1 = 1
          ${filters}
        GROUP BY a.id, a.name, a."imageUrl"
      `),
      prisma.$queryRaw<
        Array<{
          track_id: string;
          title: string;
          listen_count: bigint;
        }>
      >(Prisma.sql`
        SELECT t.id AS track_id, t.title, COUNT(*)::bigint AS listen_count
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE 1 = 1
          ${filters}
        GROUP BY t.id, t.title
        ORDER BY listen_count DESC
        LIMIT 15
      `),
      prisma.$queryRaw<Array<{ hour: number; listens: bigint }>>(Prisma.sql`
        SELECT
          EXTRACT(HOUR FROM l."playedAt")::int AS hour,
          COUNT(*)::bigint AS listens
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE 1 = 1
          ${filters}
        GROUP BY hour
        ORDER BY hour ASC
      `),
      prisma.$queryRaw<Array<{ dow: number; listens: bigint }>>(Prisma.sql`
        SELECT
          EXTRACT(DOW FROM l."playedAt")::int AS dow,
          COUNT(*)::bigint AS listens
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE 1 = 1
          ${filters}
        GROUP BY dow
      `),
      prisma.$queryRaw<Array<{ source: string; listens: bigint }>>(Prisma.sql`
        SELECT l.source, COUNT(*)::bigint AS listens
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE 1 = 1
          ${filters}
        GROUP BY l.source
        ORDER BY listens DESC
      `),
      prisma.$queryRaw<Array<{ date: Date; listens: bigint }>>(Prisma.sql`
        SELECT
          DATE(l."playedAt") AS date,
          COUNT(*)::bigint AS listens
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE 1 = 1
          ${filters}
        GROUP BY DATE(l."playedAt")
        ORDER BY listens DESC
        LIMIT 1
      `),
      prisma.$queryRaw<Array<{ cnt: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT DATE(l."playedAt"))::bigint AS cnt
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE 1 = 1
          ${filters}
      `),
    ]);

  const s = summaryRows[0];
  if (!s) {
    return null;
  }

  const transformed = transformBigIntToNumber({
    listen_count: s.listen_count,
    unique_tracks: s.unique_tracks,
    total_play_time: s.total_play_time,
  });

  const artist: ArtistStats = {
    artistId: s.artist_id,
    artistName: s.artist_name,
    imageUrl: s.image_url,
    listenCount: transformed.listen_count,
    uniqueTracks: transformed.unique_tracks,
    firstListenDate: s.first_listen_date.toISOString(),
    lastListenDate: s.last_listen_date.toISOString(),
    totalPlayTime: transformed.total_play_time,
  };

  const topTracks = topTracksRows.map((row) => {
    const bc = transformBigIntToNumber({ c: row.listen_count }).c;
    return {
      trackId: row.track_id,
      title: row.title,
      listenCount: bc,
    };
  });

  const hourMap = new Map<number, number>();
  for (const row of hourRows) {
    hourMap.set(
      row.hour,
      transformBigIntToNumber({ c: row.listens }).c
    );
  }
  const listensByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    listens: hourMap.get(hour) ?? 0,
  }));

  const mondayCounts = Array.from({ length: 7 }, () => 0);
  for (const row of dowRows) {
    const idx = dowPgToMondayFirst(row.dow);
    mondayCounts[idx] =
      transformBigIntToNumber({ c: row.listens }).c;
  }
  const listensByWeekday = mondayCounts.map((listens, weekdayIndexMondayFirst) => ({
    weekdayIndexMondayFirst,
    listens,
  }));

  const listensBySource = sourceRows.map((row) => ({
    source: row.source,
    listens: transformBigIntToNumber({ c: row.listens }).c,
  }));

  const busiest = busiestRows[0];
  const busiestDay = busiest
    ? {
        date:
          busiest.date instanceof Date
            ? busiest.date.toISOString().slice(0, 10)
            : String(busiest.date).slice(0, 10),
        listens: transformBigIntToNumber({ c: busiest.listens }).c,
      }
    : null;

  const distinctCount = distinctDaysRows[0]?.cnt;
  const activeListeningDays =
    typeof distinctCount === "bigint"
      ? Number(distinctCount)
      : typeof distinctCount === "number"
        ? distinctCount
        : Number(distinctCount ?? 0);

  const first = new Date(artist.firstListenDate);
  const last = new Date(artist.lastListenDate);
  const listeningSpanDays =
    artist.listenCount === 0
      ? 0
      : Math.max(
          1,
          Math.ceil((last.getTime() - first.getTime()) / 86_400_000) + 1
        );

  let peakListenHour: { hour: number; listens: number } | null = null;
  for (const h of listensByHour) {
    if (
      !peakListenHour ||
      h.listens > peakListenHour.listens
    ) {
      peakListenHour =
        h.listens > 0 ? { hour: h.hour, listens: h.listens } : peakListenHour;
    }
  }

  let peakWeekday: { weekdayIndexMondayFirst: number; listens: number } | null = null;
  for (const w of listensByWeekday) {
    if (
      !peakWeekday ||
      w.listens > peakWeekday.listens
    ) {
      peakWeekday =
        w.listens > 0 ? { weekdayIndexMondayFirst: w.weekdayIndexMondayFirst, listens: w.listens } : peakWeekday;
    }
  }

  return {
    artist,
    topTracks,
    listensByHour,
    listensByWeekday,
    listensBySource,
    busiestDay,
    activeListeningDays,
    listeningSpanDays,
    peakListenHour,
    peakWeekday,
  };
}
