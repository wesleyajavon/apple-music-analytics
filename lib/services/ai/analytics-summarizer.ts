/**
 * Analytics Summarization Utility
 *
 * Converts aggregated analytics into a normalized, deterministic summary
 * suitable for LLM consumption. Used exclusively server-side.
 *
 * Design: Deterministic output for same input → stable cache keys.
 * No randomness, no timestamps in the summary content.
 * Labels are localized per locale so the LLM receives context in the target language.
 */

import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type {
  AiInsightsInput,
  GenreDistributionItem,
  TimeOfDayItem,
  TopArtistItem,
  YearOverYearDelta,
} from "@/lib/dto/ai-insights";

export type AiSummarizerLocale = "fr" | "en" | "es";

/** Format seconds as "Xh Ymin" or "Xmin" for LLM consumption */
function formatSecondsToReadable(seconds: number): string {
  if (seconds <= 0) return "0min";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

/**
 * Normalized summary structure - deterministic string representation
 * for hashing and LLM prompt construction.
 */
export interface AnalyticsSummary {
  /** Human-readable summary text (deterministic) */
  text: string;
  /** Structured data for prompt (JSON string, deterministic) */
  structured: string;
}

/**
 * Summarizes and normalizes analytics data into a deterministic format.
 * Same input always produces same output → enables cache key hashing.
 * Labels are localized per locale so the LLM receives context in the target language.
 *
 * @param input - Aggregated analytics (genre distribution, time of day, top artists, deltas)
 * @param locale - fr | en | es - output language for labels
 * @returns Normalized summary with text and structured representations
 */
export function summarizeAnalytics(
  input: AiInsightsInput,
  locale: AiSummarizerLocale = "fr"
): AnalyticsSummary {
  const labels = getAiInsightsLabels(locale);
  const parts: string[] = [];

  // Date range (always first for context)
  parts.push(
    `${labels.summary.period}: ${input.dateRange.start} ${labels.summary.periodConnector} ${input.dateRange.end}`
  );

  const relationalFacts = input.relationalFacts ?? [];
  const useRelationalFacts = relationalFacts.length > 0;
  if (useRelationalFacts) {
    parts.push(relationalFacts.join("\n"));
  }

  // Genre distribution - top 10, sorted by count descending
  const sortedGenres = [...input.genreDistribution]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  if (!useRelationalFacts && sortedGenres.length > 0) {
    const genreLines = sortedGenres.map(
      (g) =>
        `  - ${g.genre}: ${g.count} ${labels.summary.listens} (${g.percentage.toFixed(1)}%)`
    );
    parts.push(
      `${labels.summary.genreDistribution}:\n` + genreLines.join("\n")
    );
  }

  // Listening by time of day - peak hours
  const sortedHours = [...input.listeningByTimeOfDay]
    .sort((a, b) => b.listens - a.listens)
    .slice(0, 5);
  if (!useRelationalFacts && sortedHours.length > 0) {
    const hourLines = sortedHours.map(
      (h) =>
        `  - ${h.hour}h-${h.hour + 1}h: ${h.listens} ${labels.summary.listens}`
    );
    parts.push(
      `${labels.summary.activeHours}:\n` + hourLines.join("\n")
    );
  }

  // Top artists - top 10
  const sortedArtists = [...input.topArtists]
    .sort((a, b) => b.listenCount - a.listenCount)
    .slice(0, 10);
  if (!useRelationalFacts && sortedArtists.length > 0) {
    const artistLines = sortedArtists.map((a) =>
      a.genre
        ? `  - ${a.artistName} (${a.genre}): ${a.listenCount} ${labels.summary.listens}`
        : `  - ${a.artistName}: ${a.listenCount} ${labels.summary.listens}`
    );
    parts.push(`${labels.summary.topArtists}:\n` + artistLines.join("\n"));
  }

  // Year-over-year deltas
  if (!useRelationalFacts && input.yearOverYearDeltas && input.yearOverYearDeltas.length > 0) {
    const deltaLines = input.yearOverYearDeltas.map((d) => {
      const isTimeMetric = /time|écoute|escucha|play/i.test(d.metric);
      const formatVal = (v: number) =>
        isTimeMetric ? formatSecondsToReadable(v) : v.toLocaleString(locale);
      return `  - ${d.metric}: ${formatVal(d.currentValue)} (vs ${formatVal(d.previousValue)}) = ${d.percentChange >= 0 ? "+" : ""}${d.percentChange.toFixed(1)}%`;
    });
    parts.push(
      `${labels.summary.evolutionVsPrevious}:\n` + deltaLines.join("\n")
    );
  }

  // Peak day/hour if available
  if (!useRelationalFacts && input.peakDay) {
    parts.push(
      `${labels.summary.peakDay}: ${input.peakDay.dayName} (${input.peakDay.listens} ${labels.summary.listens})`
    );
  }
  if (!useRelationalFacts && input.peakHour !== undefined) {
    parts.push(
      `${labels.summary.peakHour}: ${input.peakHour.hour}h (${input.peakHour.listens} ${labels.summary.listens})`
    );
  }

  const text = parts.join("\n\n");

  // Structured representation for prompt - compact JSON, sorted keys for determinism
  // timeFormatVersion: invalidates cache when time display format changes
  const structured = JSON.stringify(
    {
      dateRange: input.dateRange,
      deltas: input.yearOverYearDeltas ?? [],
      peakDay: input.peakDay ?? null,
      peakHour: input.peakHour ?? null,
      timeFormatVersion: 1, // 1 = readable (Xh Ymin), 0 = seconds
      topArtists: useRelationalFacts ? [] : sortedArtists,
      topGenres: useRelationalFacts ? [] : sortedGenres,
      topHours: useRelationalFacts ? [] : sortedHours,
      relationalFacts: relationalFacts,
    },
    null,
    0
  ); // No pretty-print to avoid whitespace variance

  return { text, structured };
}
