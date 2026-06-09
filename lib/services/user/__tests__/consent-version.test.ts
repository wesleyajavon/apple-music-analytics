import { describe, it, expect } from "vitest";
import { isGrantedConsentCurrent } from "@/lib/services/user/consent-version";

describe("isGrantedConsentCurrent", () => {
  it("returns true when granted and version matches", () => {
    expect(
      isGrantedConsentCurrent(
        { granted: true, consentVersion: "2026-06-01" },
        "2026-06-01"
      )
    ).toBe(true);
  });

  it("returns false when version is outdated", () => {
    expect(
      isGrantedConsentCurrent(
        { granted: true, consentVersion: "2025-01-01" },
        "2026-06-01"
      )
    ).toBe(false);
  });

  it("returns false when not granted", () => {
    expect(
      isGrantedConsentCurrent(
        { granted: false, consentVersion: "2026-06-01" },
        "2026-06-01"
      )
    ).toBe(false);
  });
});
