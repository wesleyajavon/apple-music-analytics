/**
 * Data Transfer Objects (DTOs) for genre distribution data
 */

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


