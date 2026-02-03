/**
 * Taste Summary Builder
 *
 * Deterministic server-side function that converts analytics data into
 * a compact, normalized "taste summary" object for LLM consumption.
 *
 * Design: Same input → same output → stable cache keys.
 * No randomness, no timestamps. Testable and reusable.
 */

import type { TasteProfileInput } from "@/lib/dto/taste-profile";

/**
 * Normalized taste summary - deterministic structure for hashing and prompts.
 * Used exclusively server-side.
 */
export interface TasteSummary {
  /** Deterministic JSON string for cache key hashing */
  structured: string;
  /** Human-readable summary for LLM prompt */
  text: string;
}

/**
 * Builds a compact taste summary from analytics input.
 * Deterministic: same input always produces same output.
 *
 * @param input - Aggregated analytics (genres, artists, temporal, diversity)
 * @returns Normalized taste summary with text and structured representations
 */
export function buildTasteSummary(input: TasteProfileInput): TasteSummary {
  // Top genres - sorted by count, top 10, deterministic order
  const topGenres = [...input.genreDistribution]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Core artists - sorted by listen count, top 10
  const coreArtists = [...input.topArtists]
    .sort((a, b) => b.listenCount - a.listenCount)
    .slice(0, 10);

  // Listening consistency: peak day/hour, top 5 hours
  const topHours = [...input.listeningByTimeOfDay]
    .sort((a, b) => b.listens - a.listens)
    .slice(0, 5);

  // Diversity metrics (derived)
  const genreCount = topGenres.length;
  const topGenreShare = topGenres[0]?.percentage ?? 0;
  const artistConcentration =
    input.uniqueArtists && input.uniqueArtists > 0 && input.totalListens
      ? (input.totalListens / input.uniqueArtists).toFixed(1)
      : null;
  const trackDiversity =
    input.uniqueTracks && input.uniqueArtists && input.uniqueArtists > 0
      ? (input.uniqueTracks / input.uniqueArtists).toFixed(1)
      : null;

  const structured = JSON.stringify(
    {
      dateRange: input.dateRange,
      topGenres: topGenres.map((g) => ({
        genre: g.genre,
        count: g.count,
        percentage: Math.round(g.percentage * 10) / 10,
      })),
      coreArtists: coreArtists.map((a) => ({
        name: a.artistName,
        listens: a.listenCount,
        genre: a.genre ?? null,
      })),
      topHours: topHours.map((h) => ({ hour: h.hour, listens: h.listens })),
      peakDay: input.peakDay ?? null,
      peakHour: input.peakHour ?? null,
      diversity: {
        genreCount,
        topGenreShare: Math.round(topGenreShare * 10) / 10,
        listensPerArtist: artistConcentration,
        tracksPerArtist: trackDiversity,
      },
      deltas: input.yearOverYearDeltas ?? [],
    },
    null,
    0
  );

  const text = formatTasteSummaryText({
    dateRange: input.dateRange,
    topGenres,
    coreArtists,
    topHours,
    peakDay: input.peakDay,
    peakHour: input.peakHour,
    diversity: {
      genreCount,
      topGenreShare,
      listensPerArtist: artistConcentration,
      tracksPerArtist: trackDiversity,
    },
  });

  return { structured, text };
}

function formatTasteSummaryText(params: {
  dateRange: { start: string; end: string };
  topGenres: Array<{ genre: string; count: number; percentage: number }>;
  coreArtists: Array<{ artistName: string; listenCount: number; genre?: string }>;
  topHours: Array<{ hour: number; listens: number }>;
  peakDay?: { dayName: string; listens: number };
  peakHour?: { hour: number; listens: number };
  diversity: {
    genreCount: number;
    topGenreShare: number;
    listensPerArtist: string | null;
    tracksPerArtist: string | null;
  };
}): string {
  const parts: string[] = [];

  parts.push(`Période: ${params.dateRange.start} à ${params.dateRange.end}`);

  if (params.topGenres.length > 0) {
    const genreLines = params.topGenres.map(
      (g) => `  - ${g.genre}: ${g.count} écoutes (${g.percentage.toFixed(1)}%)`
    );
    parts.push("Genres principaux (top 10):\n" + genreLines.join("\n"));
  }

  if (params.coreArtists.length > 0) {
    const artistLines = params.coreArtists.map((a) =>
      a.genre
        ? `  - ${a.artistName} (${a.genre}): ${a.listenCount} écoutes`
        : `  - ${a.artistName}: ${a.listenCount} écoutes`
    );
    parts.push("Artistes centraux (top 10):\n" + artistLines.join("\n"));
  }

  if (params.topHours.length > 0) {
    const hourLines = params.topHours.map(
      (h) => `  - ${h.hour}h-${h.hour + 1}h: ${h.listens} écoutes`
    );
    parts.push("Heures d'écoute actives:\n" + hourLines.join("\n"));
  }

  if (params.peakDay) {
    parts.push(
      `Jour de pic: ${params.peakDay.dayName} (${params.peakDay.listens} écoutes)`
    );
  }
  if (params.peakHour) {
    parts.push(
      `Heure de pic: ${params.peakHour.hour}h (${params.peakHour.listens} écoutes)`
    );
  }

  parts.push(
    `Diversité: ${params.diversity.genreCount} genres, genre dominant ${params.diversity.topGenreShare.toFixed(1)}%` +
      (params.diversity.listensPerArtist
        ? `, ~${params.diversity.listensPerArtist} écoutes/artiste`
        : "") +
      (params.diversity.tracksPerArtist
        ? `, ~${params.diversity.tracksPerArtist} titres/artiste`
        : "")
  );

  return parts.join("\n\n");
}
