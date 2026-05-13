/** Query key: completed users bypass redirect to overview and open the data-export onboarding wizard again */
const ADD_DATA_PARAM = "addData";

/** Navigate to onboarding finish step with Groq genre consent UI pre-filled when eligible (`DataExportOnboarding`). */
export const GENRE_AI_CONSENT_PARAM = "genreAi";

/**
 * Path for revisiting Spotify/Apple/Last.fm import after onboarding marked complete.
 */
export const DASHBOARD_ONBOARDING_REIMPORT_PATH =
  `/dashboard/onboarding?${ADD_DATA_PARAM}=1` as const;

/** Open import wizard on the IA genre consent block (sans ré-importer nécessairement). */
export const DASHBOARD_ONBOARDING_GENRE_AI_CONSENT_PATH =
  `${DASHBOARD_ONBOARDING_REIMPORT_PATH}&${GENRE_AI_CONSENT_PARAM}=1` as const;

function firstSearchParam(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Used by `app/[locale]/dashboard/onboarding/page.tsx`: when truthy (`?addData=1` or `?addData=true`),
 * users who already have `onboardingCompletedAt` can open the wizard again instead of hitting overview.
 *
 * For users who have not finished onboarding yet, plain `/dashboard/onboarding` already opens the wizard;
 * this query param is ignored in that case, so callers can safely always link here for “open import assistant”.
 */
export function wantsOnboardingImportReentry(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): boolean {
  const v = firstSearchParam(searchParams?.[ADD_DATA_PARAM]);
  return v === "1" || v === "true";
}

export function wantsGenreAiConsentLanding(
  searchParams: Record<string, string | string[] | undefined> | undefined,
): boolean {
  const v = firstSearchParam(searchParams?.[GENRE_AI_CONSENT_PARAM]);
  return v === "1" || v === "true";
}
