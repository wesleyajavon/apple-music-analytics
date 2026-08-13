import type { ListenRecordSource } from "@/lib/constants/listen-source";
import type { OnboardingImportProvider } from "./onboarding-import-mode";

/** Sources comptées pour détecter un historique Apple déjà présent (wizard + CLI legacy). */
export const ONBOARDING_APPLE_IMPORT_SOURCES = [
  "apple_music_export",
  "apple_music_replay",
  "lastfm",
] as const satisfies readonly ListenRecordSource[];

/** Sources comptées pour détecter un historique Spotify déjà présent. */
export const ONBOARDING_SPOTIFY_IMPORT_SOURCES = [
  "spotify_export",
  "spotify_web_api",
] as const satisfies readonly ListenRecordSource[];

export function onboardingImportSourcesForProvider(
  provider: OnboardingImportProvider
): readonly ListenRecordSource[] {
  return provider === "spotify"
    ? ONBOARDING_SPOTIFY_IMPORT_SOURCES
    : ONBOARDING_APPLE_IMPORT_SOURCES;
}

export function listenSourceForOnboardingProvider(
  provider: OnboardingImportProvider
): ListenRecordSource {
  return provider === "spotify" ? "spotify_export" : "apple_music_export";
}

export function playedAtToDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
