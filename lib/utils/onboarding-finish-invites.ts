/** Visibility of optional Groq invites on the onboarding finish screen. */

export type OnboardingGenreConsentInviteInput = {
  unknownTrackCount: number;
  hasBackfillJobId: boolean;
  genreLlmDeclined: boolean;
  hasActiveGroqJob: boolean;
};

export function shouldShowOnboardingGenreConsent(
  input: OnboardingGenreConsentInviteInput,
): boolean {
  return (
    input.unknownTrackCount > 0 &&
    !input.hasBackfillJobId &&
    !input.genreLlmDeclined &&
    !input.hasActiveGroqJob
  );
}

export type OnboardingGroqEnableInviteInput = {
  groqConfigured: boolean;
  groqConsentGranted: boolean;
  groqEnableDeclined: boolean;
  showGenreConsent: boolean;
  hasBackfillJobId: boolean;
  hasActiveGroqJob: boolean;
  isStartingLlmBackfill: boolean;
};

/**
 * Groq AI opt-in (insights / chat) — only after the genre-backfill card is
 * resolved or skipped, and never if a backfill already granted consent.
 */
export function shouldShowOnboardingGroqEnableInvite(
  input: OnboardingGroqEnableInviteInput,
): boolean {
  return (
    input.groqConfigured &&
    !input.groqConsentGranted &&
    !input.groqEnableDeclined &&
    !input.showGenreConsent &&
    !input.hasBackfillJobId &&
    !input.hasActiveGroqJob &&
    !input.isStartingLlmBackfill
  );
}
