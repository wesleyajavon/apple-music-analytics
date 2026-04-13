import { describe, it, expect } from "vitest";
import {
  buildExpectedDeletionPhrase,
  deletionPhrasesMatch,
  normalizeDeletionConfirmationInput,
} from "@/lib/user/deletion-confirmation-phrase";

describe("buildExpectedDeletionPhrase", () => {
  it("uses first and last token from full name", () => {
    expect(buildExpectedDeletionPhrase("Jean Dupont", null)).toBe("jean-dupont");
    expect(buildExpectedDeletionPhrase("Marie Curie Smith", null)).toBe("marie-smith");
  });

  it("strips accents and non-alphanumeric", () => {
    expect(buildExpectedDeletionPhrase("José García", null)).toBe("jose-garcia");
  });

  it("uses single token when only one word", () => {
    expect(buildExpectedDeletionPhrase("Madonna", null)).toBe("madonna");
  });

  it("falls back to email local part", () => {
    expect(buildExpectedDeletionPhrase(null, "first.last@example.com")).toBe("first-last");
    expect(buildExpectedDeletionPhrase("", "solo@example.com")).toBe("solo");
  });

  it("returns null when nothing usable", () => {
    expect(buildExpectedDeletionPhrase(null, null)).toBe(null);
    expect(buildExpectedDeletionPhrase("   ", null)).toBe(null);
  });
});

describe("deletionPhrasesMatch", () => {
  it("matches case and accent insensitive input", () => {
    expect(deletionPhrasesMatch("Jean-Dupont", "jean-dupont")).toBe(true);
    expect(deletionPhrasesMatch("  jean dupont  ", "jean-dupont")).toBe(false);
    expect(deletionPhrasesMatch("jean-dupont", "jean-dupont")).toBe(true);
  });
});

describe("normalizeDeletionConfirmationInput", () => {
  it("normalizes hyphens", () => {
    expect(normalizeDeletionConfirmationInput("Jean--Dupont")).toBe("jean-dupont");
  });
});
