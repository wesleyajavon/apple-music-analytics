/**
 * Data Transfer Objects (DTOs) for genre distribution data
 */

// Re-export Zod schemas and validation functions for convenience
export {
  GenreDistributionDtoSchema,
  GenreDistributionResponseSchema,
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

/**
 * Response wrapper for genre distribution API
 */
export interface GenreDistributionResponse {
  data: GenreDistributionDto[];
  totalListens: number;
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





