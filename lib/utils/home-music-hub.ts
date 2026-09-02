import { AUTH_PREVIEW_ARTISTS } from "@/lib/constants/auth-artist-preview";
import { HOME_PREVIEW_ALBUMS } from "@/lib/constants/home-album-preview";

export const HOME_HUB_PERIODS = ["7d", "30d", "ytd", "all"] as const;
export type HomeHubPeriod = (typeof HOME_HUB_PERIODS)[number];

export const HOME_HUB_PAGES = [
  "overview",
  "artists",
  "tracks",
  "genres",
  "timeline",
  "heatmap",
] as const;
export type HomeHubPage = (typeof HOME_HUB_PAGES)[number];

export const HOME_HUB_OVERVIEW_TABS = [
  "spotlight",
  "tops",
  "trends",
  "context",
] as const;
export type HomeHubOverviewTab = (typeof HOME_HUB_OVERVIEW_TABS)[number];

export const HOME_HUB_TREND_VIEWS = ["genres", "pulse"] as const;
export type HomeHubTrendView = (typeof HOME_HUB_TREND_VIEWS)[number];

type PeriodSnapshot = {
  listens: number;
  artists: number;
  tracks: number;
  hours: number;
  minutes: number;
  delta: number;
  heatmapTotal: number;
  artistListens: readonly [number, number, number];
  albumListens: readonly [number, number, number, number, number];
};

const PERIOD_SNAPSHOTS: Record<HomeHubPeriod, PeriodSnapshot> = {
  "7d": {
    listens: 1240,
    artists: 86,
    tracks: 214,
    hours: 18,
    minutes: 40,
    delta: 12,
    heatmapTotal: 48,
    artistListens: [64, 41, 28],
    albumListens: [42, 31, 24, 19, 16],
  },
  "30d": {
    listens: 4820,
    artists: 214,
    tracks: 641,
    hours: 68,
    minutes: 12,
    delta: 18,
    heatmapTotal: 142,
    artistListens: [214, 156, 118],
    albumListens: [186, 142, 121, 98, 84],
  },
  ytd: {
    listens: 12400,
    artists: 512,
    tracks: 1840,
    hours: 186,
    minutes: 5,
    delta: 9,
    heatmapTotal: 890,
    artistListens: [611, 448, 372],
    albumListens: [412, 356, 301, 248, 214],
  },
  all: {
    listens: 18420,
    artists: 842,
    tracks: 3241,
    hours: 312,
    minutes: 20,
    delta: 6,
    heatmapTotal: 2140,
    artistListens: [842, 611, 488],
    albumListens: [842, 704, 612, 540, 488],
  },
};

export type HomeHubArtist = {
  name: string;
  imageSrc: string;
  listens: number;
  share: number;
};

export type HomeHubAlbum = {
  name: string;
  artist: string;
  imageSrc: string;
  listens: number;
};

export type HomeHubSnapshot = {
  period: HomeHubPeriod;
  listens: number;
  uniqueArtists: number;
  uniqueTracks: number;
  hours: number;
  minutes: number;
  delta: number;
  heatmapTotal: number;
  artists: HomeHubArtist[];
  albums: HomeHubAlbum[];
};

export function getHomeHubSnapshot(period: HomeHubPeriod): HomeHubSnapshot {
  const snapshot = PERIOD_SNAPSHOTS[period];
  const topArtistListens = snapshot.artistListens[0];

  return {
    period,
    listens: snapshot.listens,
    uniqueArtists: snapshot.artists,
    uniqueTracks: snapshot.tracks,
    hours: snapshot.hours,
    minutes: snapshot.minutes,
    delta: snapshot.delta,
    heatmapTotal: snapshot.heatmapTotal,
    artists: AUTH_PREVIEW_ARTISTS.slice(0, 3).map((artist, index) => ({
      ...artist,
      listens: snapshot.artistListens[index],
      share: Math.round((snapshot.artistListens[index] / topArtistListens) * 100),
    })),
    albums: HOME_PREVIEW_ALBUMS.slice(0, 5).map((album, index) => ({
      ...album,
      listens: snapshot.albumListens[index],
    })),
  };
}

export function isHomeHubPeriod(value: string): value is HomeHubPeriod {
  return HOME_HUB_PERIODS.some((period) => period === value);
}

export function isHomeHubPage(value: string): value is HomeHubPage {
  return HOME_HUB_PAGES.some((page) => page === value);
}

export function isHomeHubOverviewTab(value: string): value is HomeHubOverviewTab {
  return HOME_HUB_OVERVIEW_TABS.some((tab) => tab === value);
}

export function formatHubDuration(hours: number, minutes: number): string {
  return `${hours}h ${minutes}min`;
}
