import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getGenreDistribution,
  getOverviewStats,
} from "@/lib/services/listening/listening-stats";
import { getTemporalAnalysis } from "@/lib/services/listening/temporal-analysis";
import { ARTIST_TO_GENRE_MAP } from "@/lib/services/genre/genre-service";
import { transformBigIntToNumber } from "@/lib/dto/transformers";
import type { MusicChatPresetQuestionId } from "@/lib/dto/music-chat";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const TRACK_OBSESSION_DEFAULT_LIMIT = 5;
const TRACK_OBSESSION_MAX_LIMIT = 10;
const TRACK_OBSESSION_DEFAULT_WINDOW_DAYS = 7;
const TRACK_OBSESSION_ALLOWED_WINDOW_DAYS = [7, 14, 30] as const;
const TRACK_OBSESSION_MAX_CANDIDATES = 200;
const TRACK_OBSESSION_DEFAULT_MIN_LISTENS_IN_WINDOW = 2;
const TRACK_OBSESSION_MAX_MIN_LISTENS_IN_WINDOW = 20;
const TASTE_SHIFT_DEFAULT_LIMIT = 5;
const TASTE_SHIFT_MAX_LIMIT = 10;
const TASTE_SHIFT_CANDIDATE_MULTIPLIER = 4;
const TASTE_SHIFT_MAX_CANDIDATES = 40;
const TASTE_SHIFT_MIN_LISTENS_PER_PERIOD = 5;

type ExplicitPeriodArgs = {
  firstStartDate: string;
  firstEndDate: string;
  secondStartDate: string;
  secondEndDate: string;
};

type TasteShiftEntityDelta = {
  firstListenCount: number;
  secondListenCount: number;
  delta: number;
  deltaPercent: number | null;
  firstSharePct: number;
  secondSharePct: number;
  shareDeltaPct: number;
};

export const MUSIC_CHAT_PRESET_QUESTIONS: Record<
  MusicChatPresetQuestionId,
  string
> = {
  "summer-2022-top-tracks":
    "What are the songs I listened to the most over summer 2022?",
  "consistent-artists":
    "Who is the artist I've been listening to the most consistently over the years?",
  "late-night-habits": "What do I usually listen to late at night?",
  "artist-deep-dive": "Tell me my listening history with Radiohead.",
  "taste-shift-2020-2024": "How did my taste change between 2020 and 2024?",
  "track-obsessions-2022": "Which songs obsessed me in 2022?",
};

export function getPresetQuestion(
  presetQuestionId: MusicChatPresetQuestionId
): string {
  return MUSIC_CHAT_PRESET_QUESTIONS[presetQuestionId];
}

export function isMusicChatPresetQuestionId(
  value: string | undefined
): value is MusicChatPresetQuestionId {
  return !!value && value in MUSIC_CHAT_PRESET_QUESTIONS;
}

function clampLimit(limit: unknown): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function clampTasteShiftLimit(limit: unknown): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return TASTE_SHIFT_DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), TASTE_SHIFT_MAX_LIMIT);
}

function clampTrackObsessionLimit(limit: unknown): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return TRACK_OBSESSION_DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(limit), 1), TRACK_OBSESSION_MAX_LIMIT);
}

function parseTrackObsessionWindowDays(windowDays: unknown): 7 | 14 | 30 {
  if (
    typeof windowDays === "number" &&
    TRACK_OBSESSION_ALLOWED_WINDOW_DAYS.includes(
      Math.trunc(windowDays) as 7 | 14 | 30
    )
  ) {
    return Math.trunc(windowDays) as 7 | 14 | 30;
  }

  return TRACK_OBSESSION_DEFAULT_WINDOW_DAYS;
}

function clampTrackObsessionMinListens(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return TRACK_OBSESSION_DEFAULT_MIN_LISTENS_IN_WINDOW;
  }

  return Math.min(
    Math.max(Math.trunc(value), 1),
    TRACK_OBSESSION_MAX_MIN_LISTENS_IN_WINDOW
  );
}

function parseDate(value: unknown, fallback?: Date): Date {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    if (fallback) return fallback;
    throw new Error("Expected date in YYYY-MM-DD format.");
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

function parseExplicitPeriodRange(args: ExplicitPeriodArgs) {
  const firstStartDate = parseDate(args.firstStartDate);
  const firstEndDate = endOfDay(parseDate(args.firstEndDate));
  const secondStartDate = parseDate(args.secondStartDate);
  const secondEndDate = endOfDay(parseDate(args.secondEndDate));

  if (firstStartDate > firstEndDate || secondStartDate > secondEndDate) {
    throw new Error("Expected each period start date to be before its end date.");
  }

  return {
    firstStartDate,
    firstEndDate,
    secondStartDate,
    secondEndDate,
  };
}

function toSharePct(count: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function toDeltaPercent(firstCount: number, delta: number): number | null {
  if (firstCount === 0) return null;
  return Number(((delta / firstCount) * 100).toFixed(2));
}

function buildTasteShiftDelta(
  firstListenCount: number,
  secondListenCount: number,
  firstTotalListens: number,
  secondTotalListens: number
): TasteShiftEntityDelta {
  const delta = secondListenCount - firstListenCount;
  const firstSharePct = toSharePct(firstListenCount, firstTotalListens);
  const secondSharePct = toSharePct(secondListenCount, secondTotalListens);

  return {
    firstListenCount,
    secondListenCount,
    delta,
    deltaPercent: toDeltaPercent(firstListenCount, delta),
    firstSharePct,
    secondSharePct,
    shareDeltaPct: Number((secondSharePct - firstSharePct).toFixed(2)),
  };
}

function parseOptionalDateRange(args: {
  startDate?: string;
  endDate?: string;
}): { startDate?: Date; endDate?: Date } {
  return {
    startDate: args.startDate ? parseDate(args.startDate) : undefined,
    endDate: args.endDate ? endOfDay(parseDate(args.endDate)) : undefined,
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function resolveDateRange(args: {
  expression?: string;
  startDate?: string;
  endDate?: string;
}): { startDate: string; endDate: string; label: string } {
  if (args.startDate && args.endDate) {
    parseDate(args.startDate);
    parseDate(args.endDate);
    return {
      startDate: args.startDate,
      endDate: args.endDate,
      label: `${args.startDate} to ${args.endDate}`,
    };
  }

  const expression = (args.expression ?? "").trim().toLowerCase();
  const yearMatch = expression.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? Number.parseInt(yearMatch[0], 10) : undefined;

  if (year && expression.includes("summer")) {
    return {
      startDate: `${year}-06-01`,
      endDate: `${year}-08-31`,
      label: `summer ${year}`,
    };
  }

  if (year && expression.includes("spring")) {
    return {
      startDate: `${year}-03-01`,
      endDate: `${year}-05-31`,
      label: `spring ${year}`,
    };
  }

  if (year && (expression.includes("fall") || expression.includes("autumn"))) {
    return {
      startDate: `${year}-09-01`,
      endDate: `${year}-11-30`,
      label: `fall ${year}`,
    };
  }

  if (year && expression.includes("winter")) {
    return {
      startDate: `${year}-12-01`,
      endDate: `${year + 1}-02-${daysInMonth(year + 1, 1)}`,
      label: `winter ${year}`,
    };
  }

  if (year) {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: `${year}`,
    };
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  if (expression.includes("last year")) {
    const previousYear = currentYear - 1;
    return {
      startDate: `${previousYear}-01-01`,
      endDate: `${previousYear}-12-31`,
      label: "last year",
    };
  }

  if (expression.includes("this year") || expression.includes("current year")) {
    return {
      startDate: `${currentYear}-01-01`,
      endDate: toIsoDate(now),
      label: "this year",
    };
  }

  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(now.getUTCDate() - 90);
  return {
    startDate: toIsoDate(ninetyDaysAgo),
    endDate: toIsoDate(now),
    label: "last 90 days",
  };
}

export async function getTopTracksForPeriod(
  userId: string,
  args: { startDate: string; endDate: string; limit?: number }
) {
  const startDate = parseDate(args.startDate);
  const endDate = endOfDay(parseDate(args.endDate));
  const limit = clampLimit(args.limit);

  const rows = await prisma.$queryRaw<
    Array<{
      track_id: string;
      track_title: string;
      artist_name: string;
      genre: string | null;
      listen_count: bigint;
      first_listen_at: Date;
      last_listen_at: Date;
    }>
  >(Prisma.sql`
    SELECT
      t.id as track_id,
      t.title as track_title,
      a.name as artist_name,
      t.genre as genre,
      COUNT(*)::bigint as listen_count,
      MIN(l."playedAt") as first_listen_at,
      MAX(l."playedAt") as last_listen_at
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."userId" = ${userId}
      AND l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
    GROUP BY t.id, t.title, a.name, t.genre
    ORDER BY listen_count DESC, t.title ASC
    LIMIT ${limit}
  `);

  return {
    period: { startDate: args.startDate, endDate: args.endDate },
    tracks: rows.map((row) => ({
      trackId: row.track_id,
      title: row.track_title,
      artistName: row.artist_name,
      genre: row.genre,
      listenCount: transformBigIntToNumber({ count: row.listen_count }).count,
      firstListenAt: row.first_listen_at.toISOString(),
      lastListenAt: row.last_listen_at.toISOString(),
    })),
  };
}

export async function getTrackObsessionWindows(
  userId: string,
  args: {
    startDate: string;
    endDate: string;
    windowDays?: number;
    limit?: number;
    minListensInWindow?: number;
  }
) {
  const startDate = parseDate(args.startDate);
  const endDate = endOfDay(parseDate(args.endDate));
  const windowDays = parseTrackObsessionWindowDays(args.windowDays);
  const limit = clampTrackObsessionLimit(args.limit);
  const minListensInWindow = clampTrackObsessionMinListens(
    args.minListensInWindow
  );

  if (startDate > endDate) {
    throw new Error("Expected start date to be before end date.");
  }

  const rows = await prisma.$queryRaw<
    Array<{
      track_id: string;
      track_title: string;
      artist_name: string;
      window_start_date: Date;
      window_end_date: Date;
      listens_in_window: bigint;
      total_listens_in_period: bigint;
    }>
  >(Prisma.sql`
    WITH period_listens AS (
      SELECT
        l."trackId" as track_id,
        t.title as track_title,
        a.name as artist_name,
        l."playedAt" as played_at,
        l."playedAt"::date as listen_day
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${startDate}
        AND l."playedAt" <= ${endDate}
    ),
    track_totals AS (
      SELECT
        track_id,
        MAX(track_title) as track_title,
        MAX(artist_name) as artist_name,
        COUNT(*)::bigint as total_listens_in_period
      FROM period_listens
      GROUP BY track_id
      ORDER BY total_listens_in_period DESC, MAX(track_title) ASC
      LIMIT ${TRACK_OBSESSION_MAX_CANDIDATES}
    ),
    window_starts AS (
      SELECT DISTINCT
        pl.track_id,
        pl.listen_day as window_start_date
      FROM period_listens pl
      JOIN track_totals tt ON tt.track_id = pl.track_id
    ),
    window_counts AS (
      SELECT
        ws.track_id,
        ws.window_start_date,
        LEAST(
          ws.window_start_date + ((${windowDays} - 1) * INTERVAL '1 day'),
          ${endDate}::date
        )::date as window_end_date,
        COUNT(pl.*)::bigint as listens_in_window
      FROM window_starts ws
      JOIN period_listens pl
        ON pl.track_id = ws.track_id
        AND pl.played_at >= ws.window_start_date::timestamp
        AND pl.played_at < ws.window_start_date::timestamp + (${windowDays} * INTERVAL '1 day')
      GROUP BY ws.track_id, ws.window_start_date
    ),
    ranked_windows AS (
      SELECT
        tt.track_id,
        tt.track_title,
        tt.artist_name,
        wc.window_start_date,
        wc.window_end_date,
        wc.listens_in_window,
        tt.total_listens_in_period,
        ROW_NUMBER() OVER (
          PARTITION BY tt.track_id
          ORDER BY wc.listens_in_window DESC, wc.window_start_date ASC
        ) as track_window_rank
      FROM window_counts wc
      JOIN track_totals tt ON tt.track_id = wc.track_id
      WHERE wc.listens_in_window >= ${minListensInWindow}
    )
    SELECT
      track_id,
      track_title,
      artist_name,
      window_start_date,
      window_end_date,
      listens_in_window,
      total_listens_in_period
    FROM ranked_windows
    WHERE track_window_rank = 1
    ORDER BY
      listens_in_window DESC,
      (listens_in_window::float / NULLIF(total_listens_in_period::float, 0)) DESC,
      total_listens_in_period DESC,
      track_title ASC
    LIMIT ${limit}
  `);

  return {
    period: { startDate: args.startDate, endDate: args.endDate },
    windowDays,
    minListensInWindow,
    limits: {
      limit,
      maxLimit: TRACK_OBSESSION_MAX_LIMIT,
      maxCandidateTracks: TRACK_OBSESSION_MAX_CANDIDATES,
    },
    obsessionWindows: rows.map((row) => {
      const counts = transformBigIntToNumber({
        listensInWindow: row.listens_in_window,
        totalListensInPeriod: row.total_listens_in_period,
      });

      return {
        trackId: row.track_id,
        title: row.track_title,
        artistName: row.artist_name,
        window: {
          startDate: toIsoDate(row.window_start_date),
          endDate: toIsoDate(row.window_end_date),
        },
        listensInWindow: counts.listensInWindow,
        totalListensInPeriod: counts.totalListensInPeriod,
      };
    }),
  };
}

export async function getTopArtistsForPeriod(
  userId: string,
  args: { startDate: string; endDate: string; limit?: number }
) {
  const startDate = parseDate(args.startDate);
  const endDate = endOfDay(parseDate(args.endDate));
  const limit = clampLimit(args.limit);

  const rows = await prisma.$queryRaw<
    Array<{
      artist_id: string;
      artist_name: string;
      listen_count: bigint;
      unique_tracks: bigint;
      first_listen_at: Date;
      last_listen_at: Date;
    }>
  >(Prisma.sql`
    SELECT
      a.id as artist_id,
      a.name as artist_name,
      COUNT(*)::bigint as listen_count,
      COUNT(DISTINCT t.id)::bigint as unique_tracks,
      MIN(l."playedAt") as first_listen_at,
      MAX(l."playedAt") as last_listen_at
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."userId" = ${userId}
      AND l."playedAt" >= ${startDate}
      AND l."playedAt" <= ${endDate}
    GROUP BY a.id, a.name
    ORDER BY listen_count DESC, artist_name ASC
    LIMIT ${limit}
  `);

  return {
    period: { startDate: args.startDate, endDate: args.endDate },
    artists: rows.map((row) => {
      const counts = transformBigIntToNumber({
        listenCount: row.listen_count,
        uniqueTracks: row.unique_tracks,
      });
      return {
        artistId: row.artist_id,
        artistName: row.artist_name,
        listenCount: counts.listenCount,
        uniqueTracks: counts.uniqueTracks,
        firstListenAt: row.first_listen_at.toISOString(),
        lastListenAt: row.last_listen_at.toISOString(),
      };
    }),
  };
}

export async function getGenreBreakdownForPeriod(
  userId: string,
  args: { startDate: string; endDate: string; limit?: number }
) {
  const startDate = parseDate(args.startDate);
  const endDate = endOfDay(parseDate(args.endDate));
  const limit = clampLimit(args.limit);
  const genres = await getGenreDistribution(startDate, endDate, userId);
  const totalListens = genres.reduce((sum, item) => sum + item.count, 0);

  return {
    period: { startDate: args.startDate, endDate: args.endDate },
    totalListens,
    genres: genres.slice(0, limit).map((item) => ({
      ...item,
      percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
    })),
  };
}

export async function getListeningHabitsByTimeOfDay(
  userId: string,
  args: { startDate?: string; endDate?: string }
) {
  const startDate = args.startDate ? parseDate(args.startDate) : undefined;
  const endDate = args.endDate ? endOfDay(parseDate(args.endDate)) : undefined;
  const temporal = await getTemporalAnalysis(startDate, endDate, userId);

  return {
    period: {
      startDate: args.startDate ?? null,
      endDate: args.endDate ?? null,
    },
    byHourOfDay: temporal.byHourOfDay,
    peakHour: temporal.peakHour,
    byDayOfWeek: temporal.byDayOfWeek,
    peakDay: temporal.peakDay,
  };
}

export async function getListeningTrendsByYear(
  userId: string,
  args: { limit?: number }
) {
  const limit = clampLimit(args.limit);
  const rows = await prisma.$queryRaw<
    Array<{
      year: number;
      listen_count: bigint;
      unique_tracks: bigint;
      unique_artists: bigint;
    }>
  >(Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM l."playedAt")::int as year,
      COUNT(*)::bigint as listen_count,
      COUNT(DISTINCT l."trackId")::bigint as unique_tracks,
      COUNT(DISTINCT t."artistId")::bigint as unique_artists
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE l."userId" = ${userId}
    GROUP BY year
    ORDER BY year ASC
    LIMIT ${limit}
  `);

  return {
    years: rows.map((row) => ({
      year: row.year,
      ...transformBigIntToNumber({
        listenCount: row.listen_count,
        uniqueTracks: row.unique_tracks,
        uniqueArtists: row.unique_artists,
      }),
    })),
  };
}

async function getArtistTasteShiftDeltas(
  userId: string,
  args: ExplicitPeriodArgs,
  options: {
    candidateLimit: number;
    deltaLimit: number;
    firstTotalListens: number;
    secondTotalListens: number;
  }
) {
  const ranges = parseExplicitPeriodRange(args);
  const rows = await prisma.$queryRaw<
    Array<{
      artist_id: string;
      artist_name: string;
      first_listen_count: bigint;
      second_listen_count: bigint;
    }>
  >(Prisma.sql`
    WITH period_artist_counts AS (
      SELECT
        'first'::text as period_key,
        a.id as artist_id,
        a.name as artist_name,
        COUNT(*)::bigint as listen_count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${ranges.firstStartDate}
        AND l."playedAt" <= ${ranges.firstEndDate}
      GROUP BY a.id, a.name

      UNION ALL

      SELECT
        'second'::text as period_key,
        a.id as artist_id,
        a.name as artist_name,
        COUNT(*)::bigint as listen_count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${ranges.secondStartDate}
        AND l."playedAt" <= ${ranges.secondEndDate}
      GROUP BY a.id, a.name
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY period_key
          ORDER BY listen_count DESC, artist_name ASC
        ) as rn
      FROM period_artist_counts
    ),
    candidates AS (
      SELECT DISTINCT artist_id
      FROM ranked
      WHERE rn <= ${options.candidateLimit}
    )
    SELECT
      c.artist_id,
      MAX(r.artist_name) as artist_name,
      COALESCE(SUM(r.listen_count) FILTER (WHERE r.period_key = 'first'), 0)::bigint as first_listen_count,
      COALESCE(SUM(r.listen_count) FILTER (WHERE r.period_key = 'second'), 0)::bigint as second_listen_count
    FROM candidates c
    JOIN ranked r ON r.artist_id = c.artist_id
    GROUP BY c.artist_id
  `);

  const deltas = rows.map((row) => {
    const counts = transformBigIntToNumber({
      firstListenCount: row.first_listen_count,
      secondListenCount: row.second_listen_count,
    });

    return {
      artistId: row.artist_id,
      artistName: row.artist_name,
      ...buildTasteShiftDelta(
        counts.firstListenCount,
        counts.secondListenCount,
        options.firstTotalListens,
        options.secondTotalListens
      ),
    };
  });

  return {
    rising: deltas
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta || a.artistName.localeCompare(b.artistName))
      .slice(0, options.deltaLimit),
    declining: deltas
      .filter((item) => item.delta < 0)
      .sort((a, b) => a.delta - b.delta || a.artistName.localeCompare(b.artistName))
      .slice(0, options.deltaLimit),
  };
}

async function getGenreTasteShiftDeltas(
  userId: string,
  args: ExplicitPeriodArgs,
  options: {
    candidateLimit: number;
    deltaLimit: number;
    firstTotalListens: number;
    secondTotalListens: number;
  }
) {
  const ranges = parseExplicitPeriodRange(args);
  const genreMapEntries = Object.entries(ARTIST_TO_GENRE_MAP);

  const mapRows = (
    rows: Array<{
      genre: string;
      first_listen_count: bigint;
      second_listen_count: bigint;
    }>
  ) => {
    const deltas = rows.map((row) => {
      const counts = transformBigIntToNumber({
        firstListenCount: row.first_listen_count,
        secondListenCount: row.second_listen_count,
      });

      return {
        genre: row.genre,
        ...buildTasteShiftDelta(
          counts.firstListenCount,
          counts.secondListenCount,
          options.firstTotalListens,
          options.secondTotalListens
        ),
      };
    });

    return {
      rising: deltas
        .filter((item) => item.delta > 0)
        .sort((a, b) => b.delta - a.delta || a.genre.localeCompare(b.genre))
        .slice(0, options.deltaLimit),
      declining: deltas
        .filter((item) => item.delta < 0)
        .sort((a, b) => a.delta - b.delta || a.genre.localeCompare(b.genre))
        .slice(0, options.deltaLimit),
    };
  };

  if (genreMapEntries.length === 0) {
    const rows = await prisma.$queryRaw<
      Array<{
        genre: string;
        first_listen_count: bigint;
        second_listen_count: bigint;
      }>
    >(Prisma.sql`
      WITH period_genre_counts AS (
        SELECT
          'first'::text as period_key,
          COALESCE(t.genre, 'Unknown') as genre,
          COUNT(*)::bigint as listen_count
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."userId" = ${userId}
          AND l."playedAt" >= ${ranges.firstStartDate}
          AND l."playedAt" <= ${ranges.firstEndDate}
        GROUP BY COALESCE(t.genre, 'Unknown')

        UNION ALL

        SELECT
          'second'::text as period_key,
          COALESCE(t.genre, 'Unknown') as genre,
          COUNT(*)::bigint as listen_count
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        WHERE l."userId" = ${userId}
          AND l."playedAt" >= ${ranges.secondStartDate}
          AND l."playedAt" <= ${ranges.secondEndDate}
        GROUP BY COALESCE(t.genre, 'Unknown')
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY period_key
            ORDER BY listen_count DESC, genre ASC
          ) as rn
        FROM period_genre_counts
      ),
      candidates AS (
        SELECT DISTINCT genre
        FROM ranked
        WHERE rn <= ${options.candidateLimit}
      )
      SELECT
        c.genre,
        COALESCE(SUM(r.listen_count) FILTER (WHERE r.period_key = 'first'), 0)::bigint as first_listen_count,
        COALESCE(SUM(r.listen_count) FILTER (WHERE r.period_key = 'second'), 0)::bigint as second_listen_count
      FROM candidates c
      JOIN ranked r ON r.genre = c.genre
      GROUP BY c.genre
    `);

    return mapRows(rows);
  }

  const valuesParts = genreMapEntries.map(([artist, genre]) =>
    Prisma.sql`(${artist}, ${genre})`
  );
  const rows = await prisma.$queryRaw<
    Array<{
      genre: string;
      first_listen_count: bigint;
      second_listen_count: bigint;
    }>
  >(Prisma.sql`
    WITH period_genre_counts AS (
      SELECT
        'first'::text as period_key,
        COALESCE(t.genre, genre_map.genre, 'Unknown') as genre,
        COUNT(*)::bigint as listen_count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      LEFT JOIN (VALUES ${Prisma.join(valuesParts)}) AS genre_map(artist_name, genre)
        ON a.name = genre_map.artist_name
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${ranges.firstStartDate}
        AND l."playedAt" <= ${ranges.firstEndDate}
      GROUP BY COALESCE(t.genre, genre_map.genre, 'Unknown')

      UNION ALL

      SELECT
        'second'::text as period_key,
        COALESCE(t.genre, genre_map.genre, 'Unknown') as genre,
        COUNT(*)::bigint as listen_count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      LEFT JOIN (VALUES ${Prisma.join(valuesParts)}) AS genre_map(artist_name, genre)
        ON a.name = genre_map.artist_name
      WHERE l."userId" = ${userId}
        AND l."playedAt" >= ${ranges.secondStartDate}
        AND l."playedAt" <= ${ranges.secondEndDate}
      GROUP BY COALESCE(t.genre, genre_map.genre, 'Unknown')
    ),
    ranked AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY period_key
          ORDER BY listen_count DESC, genre ASC
        ) as rn
      FROM period_genre_counts
    ),
    candidates AS (
      SELECT DISTINCT genre
      FROM ranked
      WHERE rn <= ${options.candidateLimit}
    )
    SELECT
      c.genre,
      COALESCE(SUM(r.listen_count) FILTER (WHERE r.period_key = 'first'), 0)::bigint as first_listen_count,
      COALESCE(SUM(r.listen_count) FILTER (WHERE r.period_key = 'second'), 0)::bigint as second_listen_count
    FROM candidates c
    JOIN ranked r ON r.genre = c.genre
    GROUP BY c.genre
  `);

  return mapRows(rows);
}

export async function getTasteShiftSummary(
  userId: string,
  args: ExplicitPeriodArgs & {
    topLimit?: number;
    deltaLimit?: number;
  }
) {
  const ranges = parseExplicitPeriodRange(args);
  const topLimit = clampTasteShiftLimit(args.topLimit);
  const deltaLimit = clampTasteShiftLimit(args.deltaLimit);
  const candidateLimit = Math.min(
    deltaLimit * TASTE_SHIFT_CANDIDATE_MULTIPLIER,
    TASTE_SHIFT_MAX_CANDIDATES
  );

  const [
    firstOverview,
    secondOverview,
    firstArtists,
    secondArtists,
    firstGenres,
    secondGenres,
  ] = await Promise.all([
    getOverviewStats(ranges.firstStartDate, ranges.firstEndDate, userId),
    getOverviewStats(ranges.secondStartDate, ranges.secondEndDate, userId),
    getTopArtistsForPeriod(userId, {
      startDate: args.firstStartDate,
      endDate: args.firstEndDate,
      limit: topLimit,
    }),
    getTopArtistsForPeriod(userId, {
      startDate: args.secondStartDate,
      endDate: args.secondEndDate,
      limit: topLimit,
    }),
    getGenreBreakdownForPeriod(userId, {
      startDate: args.firstStartDate,
      endDate: args.firstEndDate,
      limit: topLimit,
    }),
    getGenreBreakdownForPeriod(userId, {
      startDate: args.secondStartDate,
      endDate: args.secondEndDate,
      limit: topLimit,
    }),
  ]);

  const [artistDeltas, genreDeltas] = await Promise.all([
    getArtistTasteShiftDeltas(userId, args, {
      candidateLimit,
      deltaLimit,
      firstTotalListens: firstOverview.totalListens,
      secondTotalListens: secondOverview.totalListens,
    }),
    getGenreTasteShiftDeltas(userId, args, {
      candidateLimit,
      deltaLimit,
      firstTotalListens: firstOverview.totalListens,
      secondTotalListens: secondOverview.totalListens,
    }),
  ]);

  const firstInsufficient =
    firstOverview.totalListens < TASTE_SHIFT_MIN_LISTENS_PER_PERIOD;
  const secondInsufficient =
    secondOverview.totalListens < TASTE_SHIFT_MIN_LISTENS_PER_PERIOD;

  return {
    periods: {
      first: {
        startDate: args.firstStartDate,
        endDate: args.firstEndDate,
        overview: firstOverview,
        topArtists: firstArtists.artists,
        topGenres: firstGenres.genres,
      },
      second: {
        startDate: args.secondStartDate,
        endDate: args.secondEndDate,
        overview: secondOverview,
        topArtists: secondArtists.artists,
        topGenres: secondGenres.genres,
      },
    },
    deltas: {
      artists: artistDeltas,
      genres: genreDeltas,
    },
    limits: {
      topLimit,
      deltaLimit,
      candidateLimit,
      maxTopLimit: TASTE_SHIFT_MAX_LIMIT,
      maxDeltaLimit: TASTE_SHIFT_MAX_LIMIT,
    },
    dataQuality: {
      minimumListensPerPeriod: TASTE_SHIFT_MIN_LISTENS_PER_PERIOD,
      insufficientData: firstInsufficient || secondInsufficient,
      periods: {
        first: {
          totalListens: firstOverview.totalListens,
          insufficientData: firstInsufficient,
        },
        second: {
          totalListens: secondOverview.totalListens,
          insufficientData: secondInsufficient,
        },
      },
    },
  };
}

export async function compareListeningPeriods(
  userId: string,
  args: {
    firstStartDate: string;
    firstEndDate: string;
    secondStartDate: string;
    secondEndDate: string;
  }
) {
  const [firstTracks, secondTracks, firstArtists, secondArtists] =
    await Promise.all([
      getTopTracksForPeriod(userId, {
        startDate: args.firstStartDate,
        endDate: args.firstEndDate,
        limit: 5,
      }),
      getTopTracksForPeriod(userId, {
        startDate: args.secondStartDate,
        endDate: args.secondEndDate,
        limit: 5,
      }),
      getTopArtistsForPeriod(userId, {
        startDate: args.firstStartDate,
        endDate: args.firstEndDate,
        limit: 5,
      }),
      getTopArtistsForPeriod(userId, {
        startDate: args.secondStartDate,
        endDate: args.secondEndDate,
        limit: 5,
      }),
    ]);

  return {
    firstPeriod: {
      startDate: args.firstStartDate,
      endDate: args.firstEndDate,
      topTracks: firstTracks.tracks,
      topArtists: firstArtists.artists,
    },
    secondPeriod: {
      startDate: args.secondStartDate,
      endDate: args.secondEndDate,
      topTracks: secondTracks.tracks,
      topArtists: secondArtists.artists,
    },
  };
}

export async function getMostConsistentArtistsOverTime(
  userId: string,
  args: { limit?: number }
) {
  const limit = clampLimit(args.limit);
  const rows = await prisma.$queryRaw<
    Array<{
      artist_id: string;
      artist_name: string;
      total_listens: bigint;
      active_years: bigint;
      active_months: bigint;
      first_listen_at: Date;
      last_listen_at: Date;
      yearly_counts: unknown;
      consistency_score: number;
    }>
  >(Prisma.sql`
    WITH artist_years AS (
      SELECT
        a.id as artist_id,
        a.name as artist_name,
        EXTRACT(YEAR FROM l."playedAt")::int as year,
        COUNT(*)::int as listens
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
      GROUP BY a.id, a.name, year
    ),
    artist_rollup AS (
      SELECT
        a.id as artist_id,
        a.name as artist_name,
        COUNT(*)::bigint as total_listens,
        COUNT(DISTINCT EXTRACT(YEAR FROM l."playedAt"))::bigint as active_years,
        COUNT(DISTINCT TO_CHAR(l."playedAt", 'YYYY-MM'))::bigint as active_months,
        MIN(l."playedAt") as first_listen_at,
        MAX(l."playedAt") as last_listen_at
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
      GROUP BY a.id, a.name
    )
    SELECT
      r.artist_id,
      r.artist_name,
      r.total_listens,
      r.active_years,
      r.active_months,
      r.first_listen_at,
      r.last_listen_at,
      COALESCE(
        json_agg(
          json_build_object('year', y.year, 'listens', y.listens)
          ORDER BY y.year
        ) FILTER (WHERE y.year IS NOT NULL),
        '[]'::json
      ) as yearly_counts,
      (
        (r.active_years::float * 3.0)
        + (r.active_months::float * 0.5)
        + LN(r.total_listens::float + 1.0)
      )::float as consistency_score
    FROM artist_rollup r
    LEFT JOIN artist_years y ON y.artist_id = r.artist_id
    GROUP BY
      r.artist_id,
      r.artist_name,
      r.total_listens,
      r.active_years,
      r.active_months,
      r.first_listen_at,
      r.last_listen_at
    ORDER BY consistency_score DESC, r.total_listens DESC, r.artist_name ASC
    LIMIT ${limit}
  `);

  return {
    metric:
      "active years weighted highest, active months weighted lightly, plus a small total-listen boost",
    artists: rows.map((row) => {
      const counts = transformBigIntToNumber({
        totalListens: row.total_listens,
        activeYears: row.active_years,
        activeMonths: row.active_months,
      });
      return {
        artistId: row.artist_id,
        artistName: row.artist_name,
        ...counts,
        firstListenAt: row.first_listen_at.toISOString(),
        lastListenAt: row.last_listen_at.toISOString(),
        yearlyBreakdown: row.yearly_counts,
        consistencyScore: Number(row.consistency_score.toFixed(2)),
      };
    }),
  };
}

export async function getArtistDeepDive(
  userId: string,
  args: {
    artistName?: unknown;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) {
  if (typeof args.artistName !== "string" || !args.artistName.trim()) {
    throw new Error("Expected artistName.");
  }

  const requestedArtistName = args.artistName.trim();
  const artistNameLower = requestedArtistName.toLowerCase();
  const artistLikePattern = `%${escapeLikePattern(requestedArtistName)}%`;
  const limit = clampLimit(args.limit);
  const { startDate, endDate } = parseOptionalDateRange(args);
  const startDateFilter = startDate
    ? Prisma.sql`AND l."playedAt" >= ${startDate}`
    : Prisma.empty;
  const endDateFilter = endDate
    ? Prisma.sql`AND l."playedAt" <= ${endDate}`
    : Prisma.empty;
  const period = {
    startDate: args.startDate ?? null,
    endDate: args.endDate ?? null,
  };

  const summaryRows = await prisma.$queryRaw<
    Array<{
      primary_artist_id: string;
      primary_artist_name: string;
      matched_artist_names: string[];
      total_listens: bigint;
      unique_tracks: bigint;
      first_listen_at: Date | null;
      last_listen_at: Date | null;
    }>
  >(Prisma.sql`
    WITH candidate_artists AS (
      SELECT DISTINCT
        a.id,
        a.name,
        CASE
          WHEN a.name = ${requestedArtistName} THEN 0
          WHEN a."nameLower" = ${artistNameLower} THEN 1
          ELSE 2
        END as match_rank
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN "Artist" a ON t."artistId" = a.id
      WHERE l."userId" = ${userId}
        AND (
          a.name = ${requestedArtistName}
          OR a."nameLower" = ${artistNameLower}
          OR a.name ILIKE ${artistLikePattern} ESCAPE ${"\\"}
        )
    ),
    selected_artists AS (
      SELECT *
      FROM candidate_artists
      WHERE match_rank = (SELECT MIN(match_rank) FROM candidate_artists)
    )
    SELECT
      (SELECT id FROM selected_artists ORDER BY match_rank, name LIMIT 1) as primary_artist_id,
      (SELECT name FROM selected_artists ORDER BY match_rank, name LIMIT 1) as primary_artist_name,
      ARRAY(SELECT name FROM selected_artists ORDER BY match_rank, name) as matched_artist_names,
      COUNT(*)::bigint as total_listens,
      COUNT(DISTINCT t.id)::bigint as unique_tracks,
      MIN(l."playedAt") as first_listen_at,
      MAX(l."playedAt") as last_listen_at
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN selected_artists sa ON t."artistId" = sa.id
    WHERE l."userId" = ${userId}
      ${startDateFilter}
      ${endDateFilter}
    HAVING COUNT(*) > 0
  `);

  const summary = summaryRows[0];
  if (!summary) {
    return {
      found: false,
      requestedArtistName,
      period,
      totalListens: 0,
      uniqueTracks: 0,
      firstListenAt: null,
      lastListenAt: null,
      topTracks: [],
      yearlyBreakdown: [],
    };
  }

  const [topTrackRows, yearlyRows] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        track_id: string;
        track_title: string;
        genre: string | null;
        listen_count: bigint;
        first_listen_at: Date;
        last_listen_at: Date;
      }>
    >(Prisma.sql`
      WITH candidate_artists AS (
        SELECT DISTINCT
          a.id,
          CASE
            WHEN a.name = ${requestedArtistName} THEN 0
            WHEN a."nameLower" = ${artistNameLower} THEN 1
            ELSE 2
          END as match_rank
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        JOIN "Artist" a ON t."artistId" = a.id
        WHERE l."userId" = ${userId}
          AND (
            a.name = ${requestedArtistName}
            OR a."nameLower" = ${artistNameLower}
            OR a.name ILIKE ${artistLikePattern} ESCAPE ${"\\"}
          )
      ),
      selected_artists AS (
        SELECT *
        FROM candidate_artists
        WHERE match_rank = (SELECT MIN(match_rank) FROM candidate_artists)
      )
      SELECT
        t.id as track_id,
        t.title as track_title,
        t.genre as genre,
        COUNT(*)::bigint as listen_count,
        MIN(l."playedAt") as first_listen_at,
        MAX(l."playedAt") as last_listen_at
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN selected_artists sa ON t."artistId" = sa.id
      WHERE l."userId" = ${userId}
        ${startDateFilter}
        ${endDateFilter}
      GROUP BY t.id, t.title, t.genre
      ORDER BY listen_count DESC, t.title ASC
      LIMIT ${limit}
    `),
    prisma.$queryRaw<
      Array<{
        year: number;
        listen_count: bigint;
        unique_tracks: bigint;
      }>
    >(Prisma.sql`
      WITH candidate_artists AS (
        SELECT DISTINCT
          a.id,
          CASE
            WHEN a.name = ${requestedArtistName} THEN 0
            WHEN a."nameLower" = ${artistNameLower} THEN 1
            ELSE 2
          END as match_rank
        FROM "Listen" l
        JOIN "Track" t ON l."trackId" = t.id
        JOIN "Artist" a ON t."artistId" = a.id
        WHERE l."userId" = ${userId}
          AND (
            a.name = ${requestedArtistName}
            OR a."nameLower" = ${artistNameLower}
            OR a.name ILIKE ${artistLikePattern} ESCAPE ${"\\"}
          )
      ),
      selected_artists AS (
        SELECT *
        FROM candidate_artists
        WHERE match_rank = (SELECT MIN(match_rank) FROM candidate_artists)
      )
      SELECT
        EXTRACT(YEAR FROM l."playedAt")::int as year,
        COUNT(*)::bigint as listen_count,
        COUNT(DISTINCT t.id)::bigint as unique_tracks
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      JOIN selected_artists sa ON t."artistId" = sa.id
      WHERE l."userId" = ${userId}
        ${startDateFilter}
        ${endDateFilter}
      GROUP BY year
      ORDER BY year ASC
    `),
  ]);

  const counts = transformBigIntToNumber({
    totalListens: summary.total_listens,
    uniqueTracks: summary.unique_tracks,
  });

  return {
    found: true,
    requestedArtistName,
    period,
    artist: {
      artistId: summary.primary_artist_id,
      artistName: summary.primary_artist_name,
    },
    matchedArtistNames: summary.matched_artist_names,
    ...counts,
    firstListenAt: summary.first_listen_at?.toISOString() ?? null,
    lastListenAt: summary.last_listen_at?.toISOString() ?? null,
    topTracks: topTrackRows.map((row) => ({
      trackId: row.track_id,
      title: row.track_title,
      genre: row.genre,
      listenCount: transformBigIntToNumber({ count: row.listen_count }).count,
      firstListenAt: row.first_listen_at.toISOString(),
      lastListenAt: row.last_listen_at.toISOString(),
    })),
    yearlyBreakdown: yearlyRows.map((row) => ({
      year: row.year,
      ...transformBigIntToNumber({
        listenCount: row.listen_count,
        uniqueTracks: row.unique_tracks,
      }),
    })),
  };
}

export async function executeMusicChatTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "resolveDateRange":
      return resolveDateRange(args);
    case "getTopTracksForPeriod":
      return getTopTracksForPeriod(userId, args as { startDate: string; endDate: string; limit?: number });
    case "getTrackObsessionWindows":
      return getTrackObsessionWindows(
        userId,
        args as {
          startDate: string;
          endDate: string;
          windowDays?: number;
          limit?: number;
          minListensInWindow?: number;
        }
      );
    case "getTopArtistsForPeriod":
      return getTopArtistsForPeriod(userId, args as { startDate: string; endDate: string; limit?: number });
    case "getGenreBreakdownForPeriod":
      return getGenreBreakdownForPeriod(userId, args as { startDate: string; endDate: string; limit?: number });
    case "compareListeningPeriods":
      return compareListeningPeriods(
        userId,
        args as {
          firstStartDate: string;
          firstEndDate: string;
          secondStartDate: string;
          secondEndDate: string;
        }
      );
    case "getTasteShiftSummary":
      return getTasteShiftSummary(
        userId,
        args as {
          firstStartDate: string;
          firstEndDate: string;
          secondStartDate: string;
          secondEndDate: string;
          topLimit?: number;
          deltaLimit?: number;
        }
      );
    case "getListeningTrendsByYear":
      return getListeningTrendsByYear(userId, args as { limit?: number });
    case "getMostConsistentArtistsOverTime":
      return getMostConsistentArtistsOverTime(userId, args as { limit?: number });
    case "getListeningHabitsByTimeOfDay":
      return getListeningHabitsByTimeOfDay(userId, args as { startDate?: string; endDate?: string });
    case "getArtistDeepDive":
      return getArtistDeepDive(
        userId,
        args as {
          artistName?: unknown;
          startDate?: string;
          endDate?: string;
          limit?: number;
        }
      );
    default:
      throw new Error(`Unsupported music chat tool: ${toolName}`);
  }
}
