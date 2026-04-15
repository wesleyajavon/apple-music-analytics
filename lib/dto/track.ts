/**
 * Data Transfer Objects (DTOs) for track data.
 */

export interface TrackStatsDto {
  trackId: string;
  trackTitle: string;
  artistId: string;
  artistName: string;
  genre: string | null;
  listenCount: number;
  firstListenDate: string;
  lastListenDate: string;
  totalPlayTime: number;
}

export interface TrackOverviewDto {
  totalTracks: number;
  totalListens: number;
  averageListensPerTrack: number;
  topTrackListenCount: number;
}

export interface TracksResponseDto {
  overview: TrackOverviewDto;
  topTracks: TrackStatsDto[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface TrackTrendsChartTrack {
  id: string;
  title: string;
  artistName: string;
}

export interface TrackTrendsChartDataPoint {
  date: string;
  formattedDate: string;
  [trackId: string]: string | number;
}

export interface TrackTrendsChartResponse {
  data: TrackTrendsChartDataPoint[];
  availableTracks: TrackTrendsChartTrack[];
  /**
   * Top tracks for picker when `availableTracks` is filtered by explicit ids.
   */
  catalogTracks?: TrackTrendsChartTrack[];
}

export interface TrackSearchResponse {
  tracks: TrackTrendsChartTrack[];
}
