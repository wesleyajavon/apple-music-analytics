import type { GenreDistributionResponse } from "@/lib/dto/genres";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";
import { genreDistributionExcludingUnknown } from "@/lib/utils/genre-unknown-label";

export interface PublicDemoSoundprintSnapshot {
  topGenre: { name: string; percentage: number } | null;
  secondGenre: { name: string; percentage: number } | null;
  topArtist: { name: string; count: number } | null;
  peakDay: { dayName: string; listens: number } | null;
  peakHour: { hourLabel: string; listens: number } | null;
  uniqueArtists: number;
  uniqueTracks: number;
  totalListens: number;
}

function formatPeakHour(hour: number, locale: string): string {
  const date = new Date(Date.UTC(2000, 0, 1, hour));
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(date);
}

export function buildPublicDemoSoundprintSnapshot(params: {
  overview: OverviewStatsWithTopArtists;
  genres?: GenreDistributionResponse | null;
  temporal?: TemporalAnalysisDto | null;
  locale: string;
}): PublicDemoSoundprintSnapshot {
  const { overview, genres, temporal, locale } = params;
  const knownGenres = genreDistributionExcludingUnknown(genres?.data ?? []);
  const topGenreRow = knownGenres[0];
  const secondGenreRow = knownGenres[1];
  const topArtistRow = overview.topArtists[0];
  const dayNames = getAiInsightsLabels(locale).dayNames;

  return {
    topGenre: topGenreRow
      ? { name: topGenreRow.genre, percentage: topGenreRow.percentage }
      : null,
    secondGenre: secondGenreRow
      ? { name: secondGenreRow.genre, percentage: secondGenreRow.percentage }
      : null,
    topArtist: topArtistRow
      ? { name: topArtistRow.artistName, count: topArtistRow.listenCount }
      : null,
    peakDay: temporal?.peakDay
      ? {
          dayName: dayNames[temporal.peakDay.dayOfWeek] ?? String(temporal.peakDay.dayOfWeek),
          listens: temporal.peakDay.listens,
        }
      : null,
    peakHour: temporal?.peakHour
      ? {
          hourLabel: formatPeakHour(temporal.peakHour.hour, locale),
          listens: temporal.peakHour.listens,
        }
      : null,
    uniqueArtists: overview.uniqueArtists,
    uniqueTracks: overview.uniqueTracks,
    totalListens: overview.totalListens,
  };
}

export function formatDemoPercentage(value: number, locale: string): string {
  return `${Math.round(value)}%`;
}

export function formatDemoCount(value: number, locale: string): string {
  return value.toLocaleString(locale);
}
