import { describe, expect, it } from "vitest";
import { isGroqGenreNudgeEligible } from "@/lib/utils/genre-ai-nudge-eligibility";

describe("isGroqGenreNudgeEligible", () => {
  it("returns false when Groq is not configured", () => {
    expect(
      isGroqGenreNudgeEligible({
        groqConfigured: false,
        unknownRatio: 80,
        unknownTrackCount: 100,
        totalTrackCount: 120,
      })
    ).toBe(false);
  });

  it("returns false below minimum library size", () => {
    expect(
      isGroqGenreNudgeEligible({
        groqConfigured: true,
        unknownRatio: 60,
        unknownTrackCount: 8,
        totalTrackCount: 10,
      })
    ).toBe(false);
  });

  it("returns false when unknown ratio is under majority threshold", () => {
    expect(
      isGroqGenreNudgeEligible({
        groqConfigured: true,
        unknownRatio: 49,
        unknownTrackCount: 20,
        totalTrackCount: 40,
      })
    ).toBe(false);
  });

  it("returns true when majority unknown and thresholds met", () => {
    expect(
      isGroqGenreNudgeEligible({
        groqConfigured: true,
        unknownRatio: 50,
        unknownTrackCount: 20,
        totalTrackCount: 40,
      })
    ).toBe(true);
  });
});
