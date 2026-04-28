/** Query key: completed users bypass redirect to overview and open the data-export onboarding wizard again */
const ADD_DATA_PARAM = "addData";

/**
 * Path for revisiting Spotify/Apple/Last.fm import after onboarding marked complete.
 */
export const DASHBOARD_ONBOARDING_REIMPORT_PATH =
  `/dashboard/onboarding?${ADD_DATA_PARAM}=1` as const;

function firstSearchParam(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Used by `app/[locale]/dashboard/onboarding/page.tsx`: when truthy (`?addData=1` or `?addData=true`),
 * users who already have `onboardingCompletedAt` can open the wizard again instead of hitting overview.
 */
export function wantsOnboardingImportReentry(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): boolean {
  const v = firstSearchParam(searchParams?.[ADD_DATA_PARAM]);
  return v === "1" || v === "true";
}
