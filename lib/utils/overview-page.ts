import type { OverviewStatsChanges } from "@/lib/components/overview-stats-section";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";

const MOBILE_DATE_OPTS = { month: "2-digit", day: "2-digit", year: "2-digit" } as const;

export function formatMobileDateRangeLabel(
  startDate?: string,
  endDate?: string,
  locale?: string
): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(locale, MOBILE_DATE_OPTS)}–${end.toLocaleDateString(locale, MOBILE_DATE_OPTS)}`;
}

export function getPreviousPeriod(
  startDate?: string,
  endDate?: string
): { prevStartDate: string; prevEndDate: string } | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return {
    prevStartDate: prevStart.toISOString().split("T")[0],
    prevEndDate: prevEnd.toISOString().split("T")[0],
  };
}

const MAX_CHANGE_PERCENT = 999;

export function calculateChange(
  current: number,
  previous: number
): {
  value: number;
  displayValue: string;
  isPositive: boolean;
} | null {
  if (previous === 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  const value = Math.abs(change);
  const isPositive = change >= 0;
  const displayValue =
    value > MAX_CHANGE_PERCENT ? `>${MAX_CHANGE_PERCENT}` : value.toFixed(1);
  return {
    value: Math.min(value, MAX_CHANGE_PERCENT),
    displayValue,
    isPositive,
  };
}

export function formatListeningTime(totalSeconds: number, notAvailable: string) {
  if (totalSeconds <= 0) return notAvailable;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export type OverviewTrackLeader = {
  trackId: string;
  name: string;
  artistName: string;
  count: number;
  percentage: number;
};

export type OverviewArtistLeader = {
  artistId: string;
  name: string;
  count: number;
  percentage: number;
  imageUrl?: string | null;
};

/** Minimal `ArtistStatsDto` so overview tops can open the insights overlay. */
export function overviewArtistLeaderToPreview(
  artist: OverviewArtistLeader,
  rank?: number
): ArtistStatsDto {
  return {
    artistId: artist.artistId,
    artistName: artist.name,
    imageUrl: artist.imageUrl ?? null,
    listenCount: artist.count,
    uniqueTracks: 0,
    firstListenDate: "",
    lastListenDate: "",
    totalPlayTime: 0,
    ...(rank != null ? { rank } : {}),
  };
}

export type OverviewGenreLeader = {
  genre: string;
  count: number;
  percentage: number;
};

export type OverviewPrimaryInsight = {
  eyebrow: string;
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
};

export function buildOverviewPrimaryInsight(args: {
  pageTitle: string;
  locale: string;
  data: OverviewStatsWithTopArtists;
  topTrack?: OverviewTrackLeader;
  topArtist?: OverviewArtistLeader;
  labels: {
    topTrackEyebrow: string;
    topTrackBody: string;
    topArtistEyebrow: string;
    topArtistBody: string;
    libraryEyebrow: string;
    libraryBody: string;
    listens: string;
    totalListens: string;
  };
}): OverviewPrimaryInsight {
  const { pageTitle, locale, data, topTrack, topArtist, labels } = args;

  if (topTrack) {
    return {
      eyebrow: labels.topTrackEyebrow,
      title: topTrack.name,
      subtitle: labels.topTrackBody,
      metric: topTrack.count.toLocaleString(locale),
      metricLabel: labels.listens,
    };
  }

  if (topArtist) {
    return {
      eyebrow: labels.topArtistEyebrow,
      title: topArtist.name,
      subtitle: labels.topArtistBody,
      metric: topArtist.count.toLocaleString(locale),
      metricLabel: labels.listens,
    };
  }

  return {
    eyebrow: labels.libraryEyebrow,
    title: pageTitle,
    subtitle: labels.libraryBody,
    metric: data.totalListens.toLocaleString(locale),
    metricLabel: labels.totalListens,
  };
}

export function buildOverviewStatsChanges(
  previousPeriod: { prevStartDate: string; prevEndDate: string } | null,
  data: OverviewStatsWithTopArtists | undefined,
  previousData: OverviewStatsWithTopArtists | undefined
): OverviewStatsChanges {
  if (!previousPeriod || !data || !previousData) return null;
  return {
    totalListens: calculateChange(data.totalListens, previousData.totalListens),
    uniqueArtists: calculateChange(data.uniqueArtists, previousData.uniqueArtists),
    uniqueTracks: calculateChange(data.uniqueTracks, previousData.uniqueTracks),
    totalPlayTime: calculateChange(data.totalPlayTime, previousData.totalPlayTime),
  };
}
