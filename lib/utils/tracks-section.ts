import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

export const TRACKS_LOCAL_VIEWS = ["leaderboard", "ranking"] as const;
export type TracksLocalView = (typeof TRACKS_LOCAL_VIEWS)[number];

export const TRACKS_SECTIONS = ["leaderboard", "ranking", "trends"] as const;
export type TracksSection = (typeof TRACKS_SECTIONS)[number];

export function isTracksLocalView(value: string): value is TracksLocalView {
  return TRACKS_LOCAL_VIEWS.includes(value as TracksLocalView);
}

export function buildTracksSectionHref(
  section: TracksSection,
  searchParams: URLSearchParams
): string {
  if (section === "trends") {
    return mergeDashboardSearchParams("/dashboard/tracks/trends", searchParams);
  }

  const path = section === "ranking" ? "/dashboard/tracks?view=ranking" : "/dashboard/tracks";
  return mergeDashboardSearchParams(path, searchParams);
}
