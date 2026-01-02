/**
 * Data Transfer Objects (DTOs) for Last.fm API responses
 * These DTOs match the Last.fm API response structure
 */

/**
 * Last.fm track information
 */
export interface LastFmTrack {
  name: string;
  artist: {
    "#text": string;
    mbid?: string;
  };
  album?: {
    "#text": string;
    mbid?: string;
  };
  date?: {
    "#text": string;
    uts: string; // Unix timestamp
  };
  mbid?: string;
  url: string;
  image?: Array<{
    "#text": string;
    size: "small" | "medium" | "large" | "extralarge" | "mega" | "";
  }>;
  streamable?: string;
  "@attr"?: {
    nowplaying?: "true";
  };
}

/**
 * Last.fm recent tracks response
 */
export interface LastFmRecentTracksResponse {
  recenttracks: {
    track: LastFmTrack[];
    "@attr": {
      user: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

/**
 * Last.fm API error response
 */
export interface LastFmErrorResponse {
  error: number;
  message: string;
}

/**
 * Normalized track data for internal use
 */
export interface NormalizedLastFmTrack {
  trackName: string;
  artistName: string;
  albumName?: string;
  playedAt?: Date;
  mbid?: string;
  artistMbid?: string;
  albumMbid?: string;
  url: string;
  imageUrl?: string;
  isNowPlaying: boolean;
}

/**
 * Query parameters for fetching recent tracks
 */
export interface LastFmRecentTracksParams {
  username?: string;
  limit?: number;
  page?: number;
  from?: number; // Unix timestamp
  to?: number; // Unix timestamp
  extended?: 0 | 1; // Include extended track info
}




