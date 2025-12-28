/**
 * Last.fm Service
 * 
 * This service encapsulates Last.fm API calls.
 * Uses real Last.fm API when configured, falls back to mock data for development.
 * 
 * To use real API:
 * - Set LASTFM_API_KEY and LASTFM_API_SECRET in environment variables
 * - The service will automatically use the real API when keys are configured
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
 * Fetch recent tracks from Last.fm API (real or mocked)
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

  // If Last.fm is not configured, use mock data
  if (!isLastFmConfigured()) {
    console.log("⚠️  Last.fm API not configured, using mock data");
    return getMockRecentTracks(params);
  }

  // Make real API call to Last.fm
  try {
    const apiParams = new URLSearchParams({
      method: "user.getrecenttracks",
      user: username,
      api_key: LASTFM_API_KEY,
      format: "json",
      limit: limit.toString(),
      page: page.toString(),
      ...(params.from && { from: params.from.toString() }),
      ...(params.to && { to: params.to.toString() }),
    });

    const response = await fetch(`${LASTFM_BASE_URL}?${apiParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      throw new Error(`Last.fm API error: ${data.error} - ${data.message || "Unknown error"}`);
    }

    // Parse response
    const recentTracks = data.recenttracks;
    if (!recentTracks || !recentTracks.track) {
      return {
        tracks: [],
        totalPages: 0,
        currentPage: page,
        totalTracks: 0,
      };
    }

    // Handle both single track and array of tracks
    const tracks = Array.isArray(recentTracks.track) 
      ? recentTracks.track 
      : [recentTracks.track];

    // Normalize tracks
    const normalizedTracks = tracks
      .filter((track: LastFmTrack) => track.date?.uts) // Filter out now playing tracks
      .map(normalizeTrack);

    const totalTracks = parseInt(recentTracks["@attr"]?.total || "0", 10);
    const totalPages = parseInt(recentTracks["@attr"]?.totalPages || "0", 10);

    return {
      tracks: normalizedTracks,
      totalPages,
      currentPage: page,
      totalTracks,
    };
  } catch (error) {
    console.error("Error fetching from Last.fm API:", error);
    console.log("Falling back to mock data");
    return getMockRecentTracks(params);
  }
}

/**
 * Get mock recent tracks (fallback when API is not configured or fails)
 */
async function getMockRecentTracks(
  params: LastFmRecentTracksParams = {}
): Promise<{
  tracks: NormalizedLastFmTrack[];
  totalPages: number;
  currentPage: number;
  totalTracks: number;
}> {
  const limit = params.limit || 50;
  const page = params.page || 1;

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
 * Fetch recent tracks in Last.fm API format (real or mocked)
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

  // If Last.fm is not configured, use mock data
  if (!isLastFmConfigured()) {
    console.log("⚠️  Last.fm API not configured, using mock data");
    return getMockRecentTracksRaw(params);
  }

  // Make real API call to Last.fm
  try {
    const apiParams = new URLSearchParams({
      method: "user.getrecenttracks",
      user: username,
      api_key: LASTFM_API_KEY,
      format: "json",
      limit: limit.toString(),
      page: page.toString(),
      ...(params.from && { from: params.from.toString() }),
      ...(params.to && { to: params.to.toString() }),
    });

    const response = await fetch(`${LASTFM_BASE_URL}?${apiParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      throw new Error(`Last.fm API error: ${data.error} - ${data.message || "Unknown error"}`);
    }

    // Return in Last.fm format
    return data as LastFmRecentTracksResponse;
  } catch (error) {
    console.error("Error fetching from Last.fm API:", error);
    console.log("Falling back to mock data");
    return getMockRecentTracksRaw(params);
  }
}

/**
 * Get mock recent tracks in raw format (fallback)
 */
async function getMockRecentTracksRaw(
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

/**
 * Import Last.fm tracks into the database
 * Fetches tracks from Last.fm API and saves them as Listen records
 * 
 * @param userId User ID to associate listens with
 * @param params Query parameters for fetching tracks
 * @returns Import result with statistics
 */
export async function importLastFmTracks(
  userId: string,
  params: LastFmRecentTracksParams = {}
): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  totalPages?: number;
  currentPage?: number;
}> {
  const { prisma } = await import("../prisma");
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Fetch normalized tracks from Last.fm
    const result = await getRecentTracks(params);
    const { tracks, totalPages, currentPage } = result;

    // Filter out tracks that are currently playing
    const tracksToImport = tracks.filter(
      (track) => track.playedAt && !track.isNowPlaying
    );
    skipped += tracks.length - tracksToImport.length;

    // Process tracks in batches to avoid transaction timeout
    const BATCH_SIZE = 50; // Process 50 tracks at a time
    const MAX_TIMEOUT = 30000; // 30 seconds timeout per batch

    for (let i = 0; i < tracksToImport.length; i += BATCH_SIZE) {
      const batch = tracksToImport.slice(i, i + BATCH_SIZE);

      try {
        await prisma.$transaction(
          async (tx) => {
            for (const track of batch) {
              try {
                // Find or create artist
                const artistNameLower = track.artistName.toLowerCase();
                const artist = await tx.artist.upsert({
                  where: { name: track.artistName },
                  update: {
                    nameLower: artistNameLower, // Always update nameLower
                    ...(track.artistMbid && { mbid: track.artistMbid }),
                    ...(track.imageUrl && { imageUrl: track.imageUrl }),
                  },
                  create: {
                    name: track.artistName,
                    nameLower: artistNameLower,
                    ...(track.artistMbid && { mbid: track.artistMbid }),
                    ...(track.imageUrl && { imageUrl: track.imageUrl }),
                  },
                });

                // Find or create track
                const trackTitleLower = track.trackName.toLowerCase();
                const trackRecord = await tx.track.upsert({
                  where: {
                    unique_title_artist: {
                      title: track.trackName,
                      artistId: artist.id,
                    },
                  },
                  update: {
                    titleLower: trackTitleLower, // Always update titleLower
                    ...(track.mbid && { mbid: track.mbid }),
                  },
                  create: {
                    title: track.trackName,
                    titleLower: trackTitleLower,
                    artistId: artist.id,
                    ...(track.mbid && { mbid: track.mbid }),
                  },
                });

                // Check if this listen already exists (avoid duplicates)
                const existingListen = await tx.listen.findFirst({
                  where: {
                    userId,
                    trackId: trackRecord.id,
                    playedAt: track.playedAt,
                    source: "lastfm",
                  },
                });

                if (existingListen) {
                  skipped++;
                  continue;
                }

                // Create listen record (playedAt is guaranteed to exist due to filter above)
                if (!track.playedAt) {
                  skipped++;
                  continue;
                }

                await tx.listen.create({
                  data: {
                    userId,
                    trackId: trackRecord.id,
                    playedAt: track.playedAt,
                    source: "lastfm",
                  },
                });

                imported++;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                errors.push(`Error importing track "${track.trackName}" by "${track.artistName}": ${errorMessage}`);
              }
            }
          },
          {
            maxWait: MAX_TIMEOUT,
            timeout: MAX_TIMEOUT,
          }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMessage}`);
        // Continue with next batch even if this one fails
      }
    }

    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors,
      totalPages,
      currentPage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    errors.push(`Failed to import Last.fm tracks: ${errorMessage}`);
    return {
      success: false,
      imported,
      skipped,
      errors,
    };
  }
}


