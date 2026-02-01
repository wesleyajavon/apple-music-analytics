/**
 * Data Transfer Objects (DTOs) for artist data
 */

/**
 * Statistiques détaillées d'un artiste
 */
export interface ArtistStatsDto {
  artistId: string;
  artistName: string;
  imageUrl: string | null;
  listenCount: number;
  uniqueTracks: number;
  firstListenDate: string;
  lastListenDate: string;
  totalPlayTime: number; // in seconds
}

/**
 * Point de données pour les tendances d'artistes
 */
export interface ArtistTrendPointDto {
  date: string;
  artistName: string;
  listenCount: number;
}

/**
 * Vue d'ensemble des statistiques des artistes
 */
export interface ArtistOverviewDto {
  totalArtists: number;
  totalListens: number;
  averageListensPerArtist: number;
  topArtistListenCount: number;
}

/**
 * Réponse complète de l'API artists
 */
export interface ArtistsResponseDto {
  overview: ArtistOverviewDto;
  topArtists: ArtistStatsDto[];
}

/**
 * Réponse de l'API pour les tendances d'artistes
 */
export interface ArtistTrendsResponseDto {
  data: ArtistTrendPointDto[];
  period: "day" | "week" | "month";
  startDate: string;
  endDate: string;
}
