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
  signatureTrack: string;
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
      signatureTrack: ARTIST_DEEP_DIVE_SEEDS[artist.name]?.topTracks[0]?.title ?? "",
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

const PERIOD_DEEP_DIVE_SCALE: Record<HomeHubPeriod, number> = {
  "7d": 0.28,
  "30d": 1,
  ytd: 2.6,
  all: 4.1,
};

type HomeHubArtistDeepDiveSeed = {
  uniqueTracks: number;
  firstStreamAt: string;
  lastStreamAt: string;
  estHours: number;
  peakHour: number;
  peakWeekdayIndex: number;
  busiestDay: string;
  activeDays: number;
  spanDays: number;
  topTracks: readonly { title: string; baseStreams: number }[];
};

const ARTIST_DEEP_DIVE_SEEDS: Record<string, HomeHubArtistDeepDiveSeed> = {
  "The Weeknd": {
    uniqueTracks: 52,
    firstStreamAt: "2019-03-14",
    lastStreamAt: "2026-09-08",
    estHours: 38,
    peakHour: 22,
    peakWeekdayIndex: 5,
    busiestDay: "2025-11-14",
    activeDays: 214,
    spanDays: 2735,
    topTracks: [
      { title: "Blinding Lights", baseStreams: 86 },
      { title: "Starboy", baseStreams: 64 },
      { title: "Save Your Tears", baseStreams: 51 },
      { title: "The Hills", baseStreams: 42 },
      { title: "Die For You", baseStreams: 37 },
    ],
  },
  "Bad Bunny": {
    uniqueTracks: 41,
    firstStreamAt: "2020-08-02",
    lastStreamAt: "2026-09-06",
    estHours: 29,
    peakHour: 23,
    peakWeekdayIndex: 6,
    busiestDay: "2025-07-04",
    activeDays: 168,
    spanDays: 2226,
    topTracks: [
      { title: "Tití Me Preguntó", baseStreams: 71 },
      { title: "Moscow Mule", baseStreams: 58 },
      { title: "Me Porto Bonito", baseStreams: 49 },
      { title: "Ojitos Lindos", baseStreams: 40 },
      { title: "Después de la Playa", baseStreams: 33 },
    ],
  },
  GIMS: {
    uniqueTracks: 34,
    firstStreamAt: "2018-11-21",
    lastStreamAt: "2026-08-29",
    estHours: 22,
    peakHour: 20,
    peakWeekdayIndex: 4,
    busiestDay: "2024-12-31",
    activeDays: 142,
    spanDays: 2838,
    topTracks: [
      { title: "Est-ce que tu m'aimes ?", baseStreams: 58 },
      { title: "Bella", baseStreams: 47 },
      { title: "J'me Tire", baseStreams: 39 },
      { title: "Sapés comme jamais", baseStreams: 34 },
      { title: "La Même", baseStreams: 28 },
    ],
  },
};

export type HomeHubArtistDeepDive = {
  name: string;
  imageSrc: string;
  streams: number;
  share: number;
  rank: number;
  uniqueTracks: number;
  firstStreamAt: string;
  lastStreamAt: string;
  estHours: number;
  peakHour: number;
  peakWeekdayIndex: number;
  busiestDay: string;
  activeDays: number;
  spanDays: number;
  topTracks: { title: string; streamCount: number }[];
};

export function getHomeHubArtistDeepDive(
  artistName: string,
  period: HomeHubPeriod,
): HomeHubArtistDeepDive | null {
  const snapshot = getHomeHubSnapshot(period);
  const artistIndex = snapshot.artists.findIndex((artist) => artist.name === artistName);
  const artist = artistIndex >= 0 ? snapshot.artists[artistIndex] : undefined;
  const seed = ARTIST_DEEP_DIVE_SEEDS[artistName];
  if (!artist || !seed) return null;

  const scale = PERIOD_DEEP_DIVE_SCALE[period];

  return {
    name: artist.name,
    imageSrc: artist.imageSrc,
    streams: artist.listens,
    share: artist.share,
    rank: artistIndex + 1,
    uniqueTracks: Math.max(8, Math.round(seed.uniqueTracks * Math.min(1, 0.45 + scale * 0.35))),
    firstStreamAt: seed.firstStreamAt,
    lastStreamAt: seed.lastStreamAt,
    estHours: Math.max(2, Math.round(seed.estHours * scale)),
    peakHour: seed.peakHour,
    peakWeekdayIndex: seed.peakWeekdayIndex,
    busiestDay: seed.busiestDay,
    activeDays: Math.max(4, Math.round(seed.activeDays * Math.min(1, 0.2 + scale * 0.35))),
    spanDays: Math.max(7, Math.round(seed.spanDays * Math.min(1, 0.15 + scale * 0.3))),
    topTracks: seed.topTracks.map((track) => ({
      title: track.title,
      streamCount: Math.max(3, Math.round(track.baseStreams * scale)),
    })),
  };
}
