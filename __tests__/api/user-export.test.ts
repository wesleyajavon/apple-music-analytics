import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/user/export/route";

vi.mock("@/lib/auth/require-recent-auth", () => ({
  requireRecentAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 4,
    resetAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/services/user/export-user-data", () => ({
  exportAllUserData: vi.fn(),
  USER_DATA_EXPORT_VERSION: "1.0",
}));

import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import { exportAllUserData } from "@/lib/services/user/export-user-data";

describe("GET /api/user/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireRecentAuthenticatedUser).mockResolvedValue({
      ok: true,
      userId: "user-export-1",
      authenticatedAt: new Date(),
    });
    vi.mocked(exportAllUserData).mockResolvedValue({
      exportedAt: "2026-06-06T00:00:00.000Z",
      formatVersion: "1.0",
      profile: {
        id: "user-export-1",
        email: "test@example.com",
        name: null,
        avatarUrl: null,
        onboardingCompletedAt: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
      listens: [],
      replayYearly: [],
      palette: {
        artistDecisions: [],
        trackDecisions: [],
        suggestions: [],
        suggestionDecisions: [],
      },
      spotifyConnection: null,
      importGenreBackfillJobs: [],
      consents: [],
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireRecentAuthenticatedUser).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await GET(new NextRequest("http://localhost/api/user/export"));
    expect(response.status).toBe(401);
    expect(exportAllUserData).not.toHaveBeenCalled();
  });

  it("returns JSON attachment with user data", async () => {
    const response = await GET(new NextRequest("http://localhost/api/user/export"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /attachment; filename="soundprint-user-data-user-exp/
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.formatVersion).toBe("1.0");
    expect(body.profile.id).toBe("user-export-1");
    expect(exportAllUserData).toHaveBeenCalledWith("user-export-1");
  });
});
