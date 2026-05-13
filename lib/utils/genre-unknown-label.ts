/**
 * Genre placeholder when track/artist metadata is missing (see listening-stats).
 */

import type { GenreDistributionDto } from "@/lib/dto/genres";

export function isUnknownGenreLabel(genre: string): boolean {
  return genre.trim().toLowerCase() === "unknown";
}

/** First genre in API order (typically by listen count) that is not the Unknown placeholder. */
export function firstKnownGenreName(
  genres: GenreDistributionDto[] | undefined | null
): string {
  if (!genres?.length) return "";
  const found = genres.find((g) => !isUnknownGenreLabel(g.genre));
  return found?.genre ?? "";
}

/** Remove Unknown rows; renormalize percentages only when Unknown was present. */
export function genreDistributionExcludingUnknown<
  T extends { genre: string; count: number; percentage: number },
>(distribution: T[]): Array<T> {
  const strippedUnknown = distribution.some((g) => isUnknownGenreLabel(g.genre));
  const filtered = distribution.filter((g) => !isUnknownGenreLabel(g.genre));

  if (!strippedUnknown) {
    return [...filtered];
  }

  const total = filtered.reduce((s, g) => s + g.count, 0);
  if (total === 0) return [];

  return filtered.map((g) => ({
    ...g,
    percentage: (g.count / total) * 100,
  }));
}
