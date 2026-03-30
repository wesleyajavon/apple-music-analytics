/**
 * Data Transfer Objects (DTOs) for genre distribution data
 */

// Re-export Zod schemas and validation functions for convenience
export {
  GenreDistributionDtoSchema,
  GenreDistributionResponseSchema,
  GenreSpotlightArtistDtoSchema,
  GenreTopArtistsEntrySchema,
  validateDto,
  safeValidateDto,
} from './schemas';

/**
 * Represents genre distribution data
 */
export interface GenreDistributionDto {
  genre: string;
  count: number; // Absolute count of listens
  percentage: number; // Percentage of total listens
}

/** Artiste mis en avant pour un genre (top écoutes dans ce genre). */
export interface GenreSpotlightArtistDto {
  id: string;
  name: string;
  imageUrl: string | null;
  listenCount: number;
}

/** Top artistes par genre, aligné sur l’ordre des N premiers genres (ex. top 3). */
export interface GenreTopArtistsEntry {
  genre: string;
  artists: GenreSpotlightArtistDto[];
}

/**
 * Response wrapper for genre distribution API
 */
export interface GenreDistributionResponse {
  data: GenreDistributionDto[];
  totalListens: number;
  /** Top artistes pour les genres en tête de liste (même période / utilisateur). */
  topArtistsForTopGenres?: GenreTopArtistsEntry[];
}

/**
 * Point de données pour le graphique multi-lignes des tendances de genres.
 * date + formattedDate + une clé par genre (nom du genre → nombre d'écoutes).
 */
export interface GenreTrendsDataPoint {
  date: string;
  formattedDate: string;
  [genre: string]: string | number;
}

/**
 * Réponse de l'API des tendances de genres dans le temps
 */
export interface GenreTrendsResponse {
  data: GenreTrendsDataPoint[];
  availableGenres: string[];
}





