import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeGenreLabel } from "@/lib/services/genre/genre-normalization";
import type {
  PaletteCompactTrendPointDto,
  PaletteSessionDto,
} from "@/lib/dto/palette";

type QueueRow = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  unknownListens: bigint;
  impactedTracks: bigint;
};

type ExistingGenreRow = {
  genre: string;
};

type DecisionRow = {
  artistId: string;
  status: "mapped" | "skipped";
  unknownListensRemoved: number | bigint;
};

type QueueArtist = {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  unknownListens: number;
  impactedTracks: number;
};

const UNKNOWN_SQL = Prisma.sql`(t.genre IS NULL OR LOWER(t.genre) = 'unknown')`;

async function fetchUnknownQueue(userId: string): Promise<QueueArtist[]> {
  const rows = await prisma.$queryRaw<QueueRow[]>(Prisma.sql`
    SELECT
      a.id AS "artistId",
      a.name::text AS "artistName",
      a."imageUrl" AS "imageUrl",
      COUNT(*)::bigint AS "unknownListens",
      COUNT(DISTINCT t.id)::bigint AS "impactedTracks"
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    JOIN "Artist" a ON t."artistId" = a.id
    WHERE l."userId" = ${userId}
      AND ${UNKNOWN_SQL}
    GROUP BY a.id, a.name, a."imageUrl"
    ORDER BY "unknownListens" DESC, a.name ASC
  `);

  return rows.map((row) => ({
    artistId: row.artistId,
    artistName: row.artistName,
    imageUrl: row.imageUrl,
    unknownListens: Number(row.unknownListens),
    impactedTracks: Number(row.impactedTracks),
  }));
}

async function fetchExistingGenres(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<ExistingGenreRow[]>(Prisma.sql`
    SELECT DISTINCT t.genre::text AS genre
    FROM "Listen" l
    JOIN "Track" t ON l."trackId" = t.id
    WHERE l."userId" = ${userId}
      AND t.genre IS NOT NULL
      AND TRIM(t.genre) <> ''
      AND LOWER(t.genre) <> 'unknown'
    ORDER BY genre ASC
    LIMIT 300
  `);

  return rows.map((row) => row.genre);
}

function toCompactTrendSeries(
  unknownListensCurrent: number,
  decisions: DecisionRow[]
): PaletteCompactTrendPointDto[] {
  const mappedTotal = decisions
    .filter((decision) => decision.status === "mapped")
    .reduce((sum, decision) => sum + Number(decision.unknownListensRemoved), 0);
  let unknown = unknownListensCurrent + mappedTotal;
  let mapped = 0;
  const points: PaletteCompactTrendPointDto[] = [
    { step: 0, unknownListens: unknown, mappedListens: mapped },
  ];

  let step = 1;
  for (const decision of decisions) {
    if (decision.status === "mapped") {
      const removed = Number(decision.unknownListensRemoved);
      unknown = Math.max(0, unknown - removed);
      mapped += removed;
    }
    points.push({
      step,
      unknownListens: unknown,
      mappedListens: mapped,
    });
    step += 1;
  }

  return points.slice(-12);
}

export async function getPaletteSession(userId: string): Promise<PaletteSessionDto> {
  const [queue, existingGenres, decisions] = await Promise.all([
    fetchUnknownQueue(userId),
    fetchExistingGenres(userId),
    prisma.paletteArtistDecision.findMany({
      where: { userId },
      select: {
        artistId: true,
        status: true,
        unknownListensRemoved: true,
      },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  const mappedCount = decisions.filter((d) => d.status === "mapped").length;
  const skippedCount = decisions.filter((d) => d.status === "skipped").length;
  const decidedArtistIds = new Set(decisions.map((d) => d.artistId));
  const remaining = queue.filter((artist) => !decidedArtistIds.has(artist.artistId));
  const nextArtist = remaining[0] ?? null;
  const unknownListensTotal = queue.reduce((sum, artist) => sum + artist.unknownListens, 0);
  const mappedListensTotal = decisions
    .filter((d) => d.status === "mapped")
    .reduce((sum, d) => sum + Number(d.unknownListensRemoved), 0);
  const completionBase = mappedCount + skippedCount + remaining.length;
  const completionRatio =
    completionBase === 0 ? 1 : (mappedCount + skippedCount) / completionBase;

  return {
    progress: {
      totalArtists: completionBase,
      mappedArtists: mappedCount,
      skippedArtists: skippedCount,
      remainingArtists: remaining.length,
      completionRatio,
    },
    nextArtist,
    existingGenres,
    compactTrends: toCompactTrendSeries(unknownListensTotal, decisions),
    unknownListensTotal,
    mappedListensTotal,
  };
}

export async function skipPaletteArtist(userId: string, artistId: string): Promise<void> {
  const target = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true },
  });
  if (!target) {
    throw new Error("ARTIST_NOT_FOUND");
  }

  await prisma.paletteArtistDecision.upsert({
    where: { userId_artistId: { userId, artistId } },
    update: {
      status: "skipped",
      genre: null,
      artistName: target.name,
      unknownListensRemoved: 0,
      impactedTracks: 0,
    },
    create: {
      userId,
      artistId,
      artistName: target.name,
      status: "skipped",
      genre: null,
      unknownListensRemoved: 0,
      impactedTracks: 0,
    },
  });
}

export async function mapPaletteArtistGenre(
  userId: string,
  artistId: string,
  inputGenre: string
): Promise<{
  normalizedGenre: string;
  updatedTracks: number;
  unknownListensRemoved: number;
}> {
  const normalizedGenre = normalizeGenreLabel(inputGenre)?.trim();
  if (!normalizedGenre) {
    throw new Error("INVALID_GENRE");
  }

  const result = await prisma.$transaction(async (tx) => {
    const artist = await tx.artist.findUnique({
      where: { id: artistId },
      select: { id: true, name: true },
    });
    if (!artist) {
      throw new Error("ARTIST_NOT_FOUND");
    }

    const listenCountRows = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."userId" = ${userId}
        AND t."artistId" = ${artistId}
        AND ${UNKNOWN_SQL}
    `);
    const unknownListensRemoved = Number(listenCountRows[0]?.count ?? 0);

    const trackIdRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT DISTINCT t.id AS id
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."userId" = ${userId}
        AND t."artistId" = ${artistId}
        AND ${UNKNOWN_SQL}
    `);

    const trackIds = trackIdRows.map((row) => row.id);
    let updatedTracks = 0;
    if (trackIds.length > 0) {
      const updated = await tx.track.updateMany({
        where: {
          id: { in: trackIds },
        },
        data: { genre: normalizedGenre },
      });
      updatedTracks = updated.count;
    }

    await tx.paletteArtistDecision.upsert({
      where: { userId_artistId: { userId, artistId } },
      update: {
        status: "mapped",
        artistName: artist.name,
        genre: normalizedGenre,
        unknownListensRemoved,
        impactedTracks: updatedTracks,
      },
      create: {
        userId,
        artistId,
        artistName: artist.name,
        status: "mapped",
        genre: normalizedGenre,
        unknownListensRemoved,
        impactedTracks: updatedTracks,
      },
    });

    return { updatedTracks, unknownListensRemoved };
  });

  return { normalizedGenre, ...result };
}

export async function getPaletteInvitationStatus(userId: string): Promise<{
  shouldInvite: boolean;
  unknownRatio: number;
  unknownArtists: number;
}> {
  const minUnknownArtists = Number(process.env.PALETTE_INVITE_MIN_UNKNOWN_ARTISTS ?? 8);
  const minUnknownRatioPercent = Number(process.env.PALETTE_INVITE_MIN_UNKNOWN_PERCENT ?? 22);

  if (minUnknownArtists <= 0 || minUnknownRatioPercent <= 0) {
    return { shouldInvite: false, unknownRatio: 0, unknownArtists: 0 };
  }

  const [counts, queue] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint; unknown: bigint }>>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE ${UNKNOWN_SQL})::bigint AS unknown
      FROM "Listen" l
      JOIN "Track" t ON l."trackId" = t.id
      WHERE l."userId" = ${userId}
    `),
    fetchUnknownQueue(userId),
  ]);

  const total = Number(counts[0]?.total ?? 0);
  const unknown = Number(counts[0]?.unknown ?? 0);
  const unknownRatio = total > 0 ? (unknown / total) * 100 : 0;
  const unknownArtists = queue.length;

  return {
    shouldInvite:
      unknownArtists >= minUnknownArtists && unknownRatio >= minUnknownRatioPercent,
    unknownRatio,
    unknownArtists,
  };
}
