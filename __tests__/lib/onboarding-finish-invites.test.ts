import { describe, expect, it } from "vitest";
import {
  shouldShowOnboardingGenreConsent,
  shouldShowOnboardingGroqEnableInvite,
} from "@/lib/utils/onboarding-finish-invites";

const genreBase = {
  unknownTrackCount: 40,
  hasBackfillJobId: false,
  genreLlmDeclined: false,
  hasActiveGroqJob: false,
};

const groqBase = {
  groqConfigured: true,
  groqConsentGranted: false,
  groqEnableDeclined: false,
  showGenreConsent: false,
  hasBackfillJobId: false,
  hasActiveGroqJob: false,
  isStartingLlmBackfill: false,
};

describe("shouldShowOnboardingGenreConsent", () => {
  it("shows after import when unknown tracks remain", () => {
    expect(shouldShowOnboardingGenreConsent(genreBase)).toBe(true);
  });

  it("hides when every track already has a genre", () => {
    expect(
      shouldShowOnboardingGenreConsent({ ...genreBase, unknownTrackCount: 0 }),
    ).toBe(false);
  });

  it("hides after the user declines or a job is already running", () => {
    expect(
      shouldShowOnboardingGenreConsent({ ...genreBase, genreLlmDeclined: true }),
    ).toBe(false);
    expect(
      shouldShowOnboardingGenreConsent({ ...genreBase, hasBackfillJobId: true }),
    ).toBe(false);
    expect(
      shouldShowOnboardingGenreConsent({ ...genreBase, hasActiveGroqJob: true }),
    ).toBe(false);
  });
});

describe("shouldShowOnboardingGroqEnableInvite", () => {
  it("shows when Groq is configured and consent is still missing", () => {
    expect(shouldShowOnboardingGroqEnableInvite(groqBase)).toBe(true);
  });

  it("waits until the genre-backfill card is resolved", () => {
    expect(
      shouldShowOnboardingGroqEnableInvite({ ...groqBase, showGenreConsent: true }),
    ).toBe(false);
  });

  it("hides once backfill started or consent is already granted", () => {
    expect(
      shouldShowOnboardingGroqEnableInvite({ ...groqBase, hasBackfillJobId: true }),
    ).toBe(false);
    expect(
      shouldShowOnboardingGroqEnableInvite({ ...groqBase, groqConsentGranted: true }),
    ).toBe(false);
    expect(
      shouldShowOnboardingGroqEnableInvite({ ...groqBase, groqEnableDeclined: true }),
    ).toBe(false);
  });

  it("hides when Groq is not configured on the server", () => {
    expect(
      shouldShowOnboardingGroqEnableInvite({ ...groqBase, groqConfigured: false }),
    ).toBe(false);
  });
});
