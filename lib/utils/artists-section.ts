import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

export const ARTISTS_LOCAL_VIEWS = ["spotlight", "leaderboard", "ranking"] as const;
export type ArtistsLocalView = (typeof ARTISTS_LOCAL_VIEWS)[number];

export const ARTISTS_SECTIONS = ["spotlight", "leaderboard", "ranking", "trends"] as const;
export type ArtistsSection = (typeof ARTISTS_SECTIONS)[number];

export function isArtistsLocalView(value: string): value is ArtistsLocalView {
  return ARTISTS_LOCAL_VIEWS.includes(value as ArtistsLocalView);
}

export function buildArtistsSectionHref(
  section: ArtistsSection,
  searchParams: URLSearchParams
): string {
  if (section === "trends") {
    return mergeDashboardSearchParams("/dashboard/artists/trends", searchParams);
  }

  const path =
    section === "ranking"
      ? "/dashboard/artists?view=ranking"
      : section === "leaderboard"
        ? "/dashboard/artists?view=leaderboard"
        : "/dashboard/artists";
  return mergeDashboardSearchParams(path, searchParams);
}
