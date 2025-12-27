/**
 * Last.fm Service
 * 
 * This service encapsulates Last.fm API calls.
 * Currently fully mocked with sample responses.
 * 
 * When ready to use real API:
 * - Set LASTFM_API_KEY and LASTFM_API_SECRET in environment variables
 * - Replace mock functions with actual API calls
 */

import {
  LastFmTrack,
  LastFmRecentTracksResponse,
  LastFmErrorResponse,
  NormalizedLastFmTrack,
  LastFmRecentTracksParams,
} from "../dto/lastfm";

/**
 * Mock Last.fm API key (not used in mocked mode)
 */
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || "mock_api_key";
const LASTFM_API_SECRET = process.env.LASTFM_API_SECRET || "mock_api_secret";
const LASTFM_BASE_URL = "http://ws.audioscrobbler.com/2.0/";

/**
 * Generate mock recent tracks data
 */
function generateMockRecentTracks(
  limit: number = 50,
  page: number = 1
): LastFmTrack[] {
  const mockTracks: LastFmTrack[] = [
    {
      name: "Blinding Lights",
      artist: { "#text": "The Weeknd" },
      album: { "#text": "After Hours" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 30).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 30) / 1000).toString(),
      },
      url: "https://www.last.fm/music/The+Weeknd/_/Blinding+Lights",
      image: [
        {
          "#text": "https://lastfm.freetls.fastly.net/i/u/34s/example.jpg",
          size: "small",
        },
      ],
    },
    {
      name: "Levitating",
      artist: { "#text": "Dua Lipa" },
      album: { "#text": "Future Nostalgia" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 60).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 60) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Dua+Lipa/_/Levitating",
    },
    {
      name: "Anti-Hero",
      artist: { "#text": "Taylor Swift" },
      album: { "#text": "Midnights" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 90).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 90) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Taylor+Swift/_/Anti-Hero",
    },
    {
      name: "Do I Wanna Know?",
      artist: { "#text": "Arctic Monkeys" },
      album: { "#text": "AM" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 120).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 120) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Arctic+Monkeys/_/Do+I+Wanna+Know%3F",
    },
    {
      name: "HUMBLE.",
      artist: { "#text": "Kendrick Lamar" },
      album: { "#text": "DAMN." },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 150).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 150) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Kendrick+Lamar/_/HUMBLE.",
    },
    {
      name: "One More Time",
      artist: { "#text": "Daft Punk" },
      album: { "#text": "Discovery" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 180).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 180) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Daft+Punk/_/One+More+Time",
    },
    {
      name: "Holocene",
      artist: { "#text": "Bon Iver" },
      album: { "#text": "Bon Iver" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 210).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 210) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Bon+Iver/_/Holocene",
    },
    {
      name: "Space Song",
      artist: { "#text": "Beach House" },
      album: { "#text": "Depression Cherry" },
      date: {
        "#text": new Date(Date.now() - 1000 * 60 * 240).toUTCString(),
        uts: Math.floor((Date.now() - 1000 * 60 * 240) / 1000).toString(),
      },
      url: "https://www.last.fm/music/Beach+House/_/Space+Song",
    },
  ];

  // Generate more tracks by duplicating and varying timestamps
  const tracks: LastFmTrack[] = [];
  const totalNeeded = limit * page;
  const hoursAgo = Array.from({ length: totalNeeded }, (_, i) => i * 2);

  for (let i = 0; i < totalNeeded; i++) {
    const baseTrack = mockTracks[i % mockTracks.length];
    const hours = hoursAgo[i];
    const playedAt = new Date(Date.now() - 1000 * 60 * 60 * hours);

    tracks.push({
      ...baseTrack,
      date: {
        "#text": playedAt.toUTCString(),
        uts: Math.floor(playedAt.getTime() / 1000).toString(),
      },
    });
  }

  // Return only the tracks for the requested page
  const startIndex = (page - 1) * limit;
  return tracks.slice(startIndex, startIndex + limit);
}

/**
 * Normalize Last.fm track to internal format
 */
function normalizeTrack(track: LastFmTrack): NormalizedLastFmTrack {
  const imageUrl =
    track.image?.find((img) => img.size === "large" || img.size === "extralarge")
      ?.["#text"] || track.image?.[0]?.["#text"];

  return {
    trackName: track.name,
    artistName: track.artist["#text"],
    albumName: track.album?.["#text"],
    playedAt: track.date?.uts
      ? new Date(parseInt(track.date.uts) * 1000)
      : undefined,
    mbid: track.mbid,
    artistMbid: track.artist.mbid,
    albumMbid: track.album?.mbid,
    url: track.url,
    imageUrl,
    isNowPlaying: track["@attr"]?.nowplaying === "true",
  };
}

/**
 * Fetch recent tracks from Last.fm (MOCKED)
 * 
 * @param params Query parameters
 * @returns Normalized recent tracks
 */
export async function getRecentTracks(
  params: LastFmRecentTracksParams = {}
): Promise<{
  tracks: NormalizedLastFmTrack[];
  totalPages: number;
  currentPage: number;
  totalTracks: number;
}> {
  const limit = params.limit || 50;
  const page = params.page || 1;
  const username = params.username || "mock_user";

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Generate mock data
  const mockTracks = generateMockRecentTracks(limit, page);

  // Filter by date range if provided
  let filteredTracks = mockTracks;
  if (params.from || params.to) {
    filteredTracks = mockTracks.filter((track) => {
      if (!track.date?.uts) return false;
      const timestamp = parseInt(track.date.uts);
      if (params.from && timestamp < params.from) return false;
      if (params.to && timestamp > params.to) return false;
      return true;
    });
  }

  // Normalize tracks
  const normalizedTracks = filteredTracks.map(normalizeTrack);

  // Calculate totals (mock)
  const totalTracks = 1000; // Mock total
  const totalPages = Math.ceil(totalTracks / limit);

  return {
    tracks: normalizedTracks,
    totalPages,
    currentPage: page,
    totalTracks,
  };
}

/**
 * Fetch recent tracks in Last.fm API format (MOCKED)
 * 
 * This function returns data in the exact format of Last.fm API
 * for compatibility with existing Last.fm integrations
 */
export async function getRecentTracksRaw(
  params: LastFmRecentTracksParams = {}
): Promise<LastFmRecentTracksResponse> {
  const limit = params.limit || 50;
  const page = params.page || 1;
  const username = params.username || "mock_user";

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Generate mock data
  const mockTracks = generateMockRecentTracks(limit, page);

  // Filter by date range if provided
  let filteredTracks = mockTracks;
  if (params.from || params.to) {
    filteredTracks = mockTracks.filter((track) => {
      if (!track.date?.uts) return false;
      const timestamp = parseInt(track.date.uts);
      if (params.from && timestamp < params.from) return false;
      if (params.to && timestamp > params.to) return false;
      return true;
    });
  }

  const totalTracks = 1000; // Mock total
  const totalPages = Math.ceil(totalTracks / limit);

  return {
    recenttracks: {
      track: filteredTracks,
      "@attr": {
        user: username,
        page: page.toString(),
        perPage: limit.toString(),
        totalPages: totalPages.toString(),
        total: totalTracks.toString(),
      },
    },
  };
}

/**
 * Check if Last.fm API is configured
 */
export function isLastFmConfigured(): boolean {
  return (
    LASTFM_API_KEY !== "mock_api_key" &&
    LASTFM_API_SECRET !== "mock_api_secret" &&
    !!LASTFM_API_KEY &&
    !!LASTFM_API_SECRET
  );
}

/**
 * Get Last.fm API base URL
 */
export function getLastFmBaseUrl(): string {
  return LASTFM_BASE_URL;
}


