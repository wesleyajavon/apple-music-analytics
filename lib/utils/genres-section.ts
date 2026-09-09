import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

export const GENRES_LOCAL_VIEWS = ["spotlight", "distribution", "ranking"] as const;
export type GenresLocalView = (typeof GENRES_LOCAL_VIEWS)[number];

export const GENRES_SECTIONS = ["spotlight", "distribution", "ranking", "trends"] as const;
export type GenresSection = (typeof GENRES_SECTIONS)[number];

export function isGenresLocalView(value: string): value is GenresLocalView {
  return GENRES_LOCAL_VIEWS.includes(value as GenresLocalView);
}

export function buildGenresSectionHref(
  section: GenresSection,
  searchParams: URLSearchParams
): string {
  if (section === "trends") {
    return mergeDashboardSearchParams("/dashboard/genres/trends", searchParams);
  }

  const path =
    section === "ranking"
      ? "/dashboard/genres?view=ranking"
      : section === "distribution"
        ? "/dashboard/genres?view=distribution"
        : "/dashboard/genres";
  return mergeDashboardSearchParams(path, searchParams);
}
