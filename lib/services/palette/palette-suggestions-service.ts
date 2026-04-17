import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeGenreLabel } from "@/lib/services/genre/genre-normalization";
import type { PaletteMode, PaletteSuggestionDto } from "@/lib/dto/palette";

type SuggestionSeed = {
  provider: string;
  genre: string;
  confidence: number;
  reason: string;
  evidence?: Record<string, unknown>;
};

type GenreCountRow = { genre: string; c: bigint };

function uniqueSeeds(seeds: SuggestionSeed[]): SuggestionSeed[] {
  const map = new Map<string, SuggestionSeed>();
  for (const seed of seeds) {
    const normalized = normalizeGenreLabel(seed.genre)?.trim();
    if (!normalized) continue;
    const key = `${seed.provider}:${normalized.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, { ...seed, genre: normalized });
    }
  }
  return [...map.values()];
}

async function fetchTopUserGenres(userId: string, limit = 5): Promise<SuggestionSeed[]> {
  const rows = await prisma.$queryRaw<GenreCountRow[]>(Prisma.sql`
    SELECT t.genre::text AS genre, COUNT(*)::bigint AS c
    FROM "Listen" l
    JOIN "Track" t ON t.id = l."trackId"
    WHERE l."userId" = ${userId}
      AND t.genre IS NOT NULL
      AND TRIM(t.genre) <> ''
      AND LOWER(t.genre) <> 'unknown'
    GROUP BY t.genre
    ORDER BY c DESC
    LIMIT ${limit}
  `);
  return rows.map((row, idx) => ({
    provider: "internal_user_top",
    genre: row.genre,
    confidence: Math.max(0.4, 0.7 - idx * 0.05),
    reason: "Popular in your listening history",
    evidence: { listens: Number(row.c) },
  }));
}

async function fetchArtistKnownGenres(artistId: string, limit = 3): Promise<SuggestionSeed[]> {
  const rows = await prisma.$queryRaw<GenreCountRow[]>(Prisma.sql`
    SELECT t.genre::text AS genre, COUNT(*)::bigint AS c
    FROM "Track" t
    WHERE t."artistId" = ${artistId}
      AND t.genre IS NOT NULL
      AND TRIM(t.genre) <> ''
      AND LOWER(t.genre) <> 'unknown'
    GROUP BY t.genre
    ORDER BY c DESC
    LIMIT ${limit}
  `);
  return rows.map((row, idx) => ({
    provider: "internal_artist_catalog",
    genre: row.genre,
    confidence: Math.max(0.55, 0.82 - idx * 0.08),
    reason: "Known genres already found for this artist",
    evidence: { tracks: Number(row.c) },
  }));
}

async function fetchTrackKnownGenres(trackId: string, limit = 3): Promise<SuggestionSeed[]> {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { titleLower: true, artistId: true },
  });
  if (!track) return [];
  const rows = await prisma.$queryRaw<GenreCountRow[]>(Prisma.sql`
    SELECT t.genre::text AS genre, COUNT(*)::bigint AS c
    FROM "Track" t
    WHERE t."titleLower" = ${track.titleLower}
      AND t."artistId" = ${track.artistId}
      AND t.genre IS NOT NULL
      AND TRIM(t.genre) <> ''
      AND LOWER(t.genre) <> 'unknown'
    GROUP BY t.genre
    ORDER BY c DESC
    LIMIT ${limit}
  `);
  return rows.map((row, idx) => ({
    provider: "internal_track_catalog",
    genre: row.genre,
    confidence: Math.max(0.55, 0.85 - idx * 0.1),
    reason: "Known genres already found for this track",
    evidence: { tracks: Number(row.c) },
  }));
}

function isExternalSuggestionsEnabled(): boolean {
  const v = (process.env.PALETTE_EXTERNAL_SUGGESTIONS_ENABLED ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export async function getPaletteSuggestions(args: {
  userId: string;
  mode: PaletteMode;
  artistId?: string;
  trackId?: string;
}): Promise<PaletteSuggestionDto[]> {
  const seeds: SuggestionSeed[] = [];
  seeds.push(...(await fetchTopUserGenres(args.userId, 5)));
  if (args.mode === "artists" && args.artistId) {
    seeds.push(...(await fetchArtistKnownGenres(args.artistId, 4)));
  }
  if (args.mode === "tracks" && args.trackId) {
    seeds.push(...(await fetchTrackKnownGenres(args.trackId, 4)));
  }

  // Feature-flag placeholder for external providers. Off by default.
  if (isExternalSuggestionsEnabled()) {
    // Keep v1 conservative: external integration intentionally deferred.
  }

  const cleanSeeds = uniqueSeeds(seeds).slice(0, 8);
  if (cleanSeeds.length === 0) return [];

  const created = await prisma.$transaction(
    cleanSeeds.map((seed) =>
      prisma.paletteSuggestion.create({
        data: {
          userId: args.userId,
          mode: args.mode,
          artistId: args.mode === "artists" ? args.artistId : null,
          trackId: args.mode === "tracks" ? args.trackId : null,
          provider: seed.provider,
          suggestedGenreRaw: seed.genre,
          suggestedGenreNormalized: seed.genre,
          confidence: seed.confidence,
          evidence: (seed.evidence ?? { reason: seed.reason }) as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          provider: true,
          suggestedGenreNormalized: true,
          confidence: true,
          evidence: true,
        },
      })
    )
  );

  return created.map((row) => ({
    id: row.id,
    provider: row.provider,
    genre: row.suggestedGenreNormalized,
    confidence: row.confidence,
    reason:
      typeof row.evidence === "object" &&
      row.evidence !== null &&
      "reason" in row.evidence &&
      typeof (row.evidence as { reason?: unknown }).reason === "string"
        ? ((row.evidence as { reason: string }).reason ?? "Suggested")
        : "Suggested",
  }));
}

export async function recordPaletteSuggestionDecision(args: {
  userId: string;
  suggestionId?: string;
  finalGenre?: string;
  decision: "accepted" | "edited" | "rejected";
}): Promise<void> {
  const suggestionId = args.suggestionId?.trim();
  if (!suggestionId) return;
  const suggestion = await prisma.paletteSuggestion.findUnique({
    where: { id: suggestionId },
    select: { id: true, userId: true },
  });
  if (!suggestion || suggestion.userId !== args.userId) return;

  await prisma.paletteSuggestionDecision.create({
    data: {
      suggestionId,
      userId: args.userId,
      decision: args.decision,
      finalGenre: args.finalGenre?.trim() || null,
    },
  });
}
