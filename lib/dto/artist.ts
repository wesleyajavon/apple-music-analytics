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
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
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

/** Artiste disponible pour le graphique multi-lignes (trends-chart). */
export interface ArtistTrendsChartArtist {
  id: string;
  name: string;
}

/**
 * Point pivot pour `/api/artists/trends-chart` (une clé dynamique par artistId).
 */
export interface ArtistTrendsChartDataPoint {
  date: string;
  formattedDate: string;
  [artistId: string]: string | number;
}

export interface ArtistTrendsChartResponse {
  data: ArtistTrendsChartDataPoint[];
  availableArtists: ArtistTrendsChartArtist[];
  /**
   * Top artists for the picker when `availableArtists` is a filtered series (explicit `artists` query).
   * Lets users browse the usual “top” list while the chart shows only selected IDs.
   */
  catalogArtists?: ArtistTrendsChartArtist[];
}

/** Réponse de recherche d’artistes (catalogue DB). */
export interface ArtistSearchResponse {
  artists: ArtistTrendsChartArtist[];
}

/** Titre le plus joué avec cet artiste (période filtrée). */
export interface ArtistUserInsightsTrackDto {
  trackId: string;
  title: string;
  listenCount: number;
}

export interface ArtistUserInsightsHourBucketDto {
  hour: number;
  listens: number;
}

/** 0 = lundi … 6 = dimanche (aligné analyse temporelle du dashboard). */
export interface ArtistUserInsightsWeekdayBucketDto {
  weekdayIndexMondayFirst: number;
  listens: number;
}

export interface ArtistUserInsightsSourceBucketDto {
  source: string;
  listens: number;
}

/** Insight « relation » utilisateur × artiste (agrégés). */
export interface ArtistUserInsightsDto {
  artist: ArtistStatsDto;
  topTracks: ArtistUserInsightsTrackDto[];
  listensByHour: ArtistUserInsightsHourBucketDto[];
  listensByWeekday: ArtistUserInsightsWeekdayBucketDto[];
  listensBySource: ArtistUserInsightsSourceBucketDto[];
  busiestDay: { date: string; listens: number } | null;
  /** Jours distincts avec au moins une écoute (fenêtre sélectionnée). */
  activeListeningDays: number;
  listeningSpanDays: number;
  peakListenHour: { hour: number; listens: number } | null;
  peakWeekday: { weekdayIndexMondayFirst: number; listens: number } | null;
}
