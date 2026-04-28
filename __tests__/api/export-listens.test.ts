/**
 * Tests d'intégration pour GET /api/export/listens
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/export/listens/route";

vi.mock("@/lib/services/listening/listening-service", () => ({
  getAllListensForExport: vi.fn(),
}));
vi.mock("@/lib/auth/require-recent-auth", () => ({
  requireRecentAuthenticatedUser: vi.fn().mockResolvedValue({
    ok: true,
    userId: "user-1",
    authenticatedAt: new Date(),
  }),
}));

import { getAllListensForExport } from "@/lib/services/listening/listening-service";

describe("GET /api/export/listens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 200 with CSV attachment headers", async () => {
    vi.mocked(getAllListensForExport).mockResolvedValue([
      {
        date: "2024-01-15",
        artistName: "Artist",
        trackTitle: "Track",
        genre: "Rock",
        source: "lastfm",
      },
    ]);

    const request = new NextRequest("http://localhost/api/export/listens");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
    expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    const text = await response.text();
    expect(text).toContain("Date");
    expect(text).toContain("Artist");
    expect(getAllListensForExport).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: undefined,
      userId: "user-1",
      source: undefined,
    });
  });

  it("should return 400 for unsupported format", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/listens?format=json"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should return 400 for invalid date range", async () => {
    const request = new NextRequest(
      "http://localhost/api/export/listens?startDate=not-a-date"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getAllListensForExport throws", async () => {
    vi.mocked(getAllListensForExport).mockRejectedValue(new Error("DB error"));

    const request = new NextRequest("http://localhost/api/export/listens");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
