import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH } from "@/app/api/user/privacy-preferences/route";

vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 29,
    resetAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/services/user/privacy-preferences", () => ({
  getPrivacyPreferences: vi.fn(),
  grantGroqGenreConsent: vi.fn(),
  revokeGroqGenreConsent: vi.fn(),
  setPublicProfileOptIn: vi.fn(),
}));

import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import {
  getPrivacyPreferences,
  grantGroqGenreConsent,
  revokeGroqGenreConsent,
  setPublicProfileOptIn,
} from "@/lib/services/user/privacy-preferences";

const PREFERENCES = {
  groqGenreConsent: { granted: false },
  publicProfile: { eligible: false, granted: false },
  groqJobActive: false,
};

describe("/api/user/privacy-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user-privacy-1");
    vi.mocked(getPrivacyPreferences).mockResolvedValue(PREFERENCES);
    vi.mocked(revokeGroqGenreConsent).mockResolvedValue({ jobsCancelled: 2 });
    vi.mocked(grantGroqGenreConsent).mockResolvedValue(undefined);
    vi.mocked(setPublicProfileOptIn).mockResolvedValue(undefined);
  });

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
      const response = await GET(new NextRequest("http://localhost/api/user/privacy-preferences"));
      expect(response.status).toBe(401);
    });

    it("returns privacy preferences for authenticated user", async () => {
      const response = await GET(new NextRequest("http://localhost/api/user/privacy-preferences"));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.groqGenreConsent.granted).toBe(false);
      expect(getPrivacyPreferences).toHaveBeenCalledWith("user-privacy-1");
    });
  });

  describe("PATCH", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
      const response = await PATCH(
        new NextRequest("http://localhost/api/user/privacy-preferences", {
          method: "PATCH",
          body: JSON.stringify({ groqGenreConsent: true }),
        })
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 when body is empty", async () => {
      const response = await PATCH(
        new NextRequest("http://localhost/api/user/privacy-preferences", {
          method: "PATCH",
          body: JSON.stringify({}),
        })
      );
      expect(response.status).toBe(400);
    });

    it("grants Groq consent when requested", async () => {
      vi.mocked(getPrivacyPreferences).mockResolvedValue({
        ...PREFERENCES,
        groqGenreConsent: { granted: true },
      });

      const response = await PATCH(
        new NextRequest("http://localhost/api/user/privacy-preferences", {
          method: "PATCH",
          body: JSON.stringify({ groqGenreConsent: true }),
        })
      );
      expect(response.status).toBe(200);
      expect(grantGroqGenreConsent).toHaveBeenCalledWith("user-privacy-1", expect.anything());
    });

    it("revokes Groq consent and reports cancelled jobs", async () => {
      const response = await PATCH(
        new NextRequest("http://localhost/api/user/privacy-preferences", {
          method: "PATCH",
          body: JSON.stringify({ groqGenreConsent: false }),
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobsCancelled).toBe(2);
      expect(revokeGroqGenreConsent).toHaveBeenCalledWith("user-privacy-1", expect.anything());
    });

    it("returns 403 when public profile is not eligible", async () => {
      vi.mocked(setPublicProfileOptIn).mockRejectedValue(
        new Error("PUBLIC_PROFILE_NOT_ELIGIBLE")
      );

      const response = await PATCH(
        new NextRequest("http://localhost/api/user/privacy-preferences", {
          method: "PATCH",
          body: JSON.stringify({ publicProfile: true }),
        })
      );
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe("NOT_ELIGIBLE");
    });
  });
});
