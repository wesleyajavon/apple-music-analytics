/**
 * Tests d'intégration pour GET /api/lastfm et POST /api/lastfm/import
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/lastfm/route";
import { POST as POSTImport } from "@/app/api/lastfm/import/route";

vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/services/lastfm", () => ({
  getRecentTracks: vi.fn(),
  getRecentTracksRaw: vi.fn(),
  isLastFmConfigured: vi.fn(),
  importLastFmTracks: vi.fn(),
}));

import {
  getRecentTracks,
  getRecentTracksRaw,
  isLastFmConfigured,
  importLastFmTracks,
} from "@/lib/services/lastfm";
import type { NormalizedLastFmTrack } from "@/lib/dto/lastfm";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";

const normalizedResponse = {
  tracks: [] as NormalizedLastFmTrack[],
  totalPages: 1,
  currentPage: 1,
  totalTracks: 0,
};

const rawResponse = {
  recenttracks: { track: [] },
};

describe("GET /api/lastfm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isLastFmConfigured).mockReturnValue(true);
    vi.mocked(getRecentTracks).mockResolvedValue(normalizedResponse);
    vi.mocked(getRecentTracksRaw).mockResolvedValue(rawResponse as never);
  });

  it("should return 200 with normalized tracks by default", async () => {
    const request = new NextRequest("http://localhost/api/lastfm");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data._meta).toHaveProperty("mocked");
    expect(getRecentTracks).toHaveBeenCalled();
  });

  it("should return 200 with raw format when format=raw", async () => {
    const request = new NextRequest("http://localhost/api/lastfm?format=raw");
    const response = await GET(request);

    expect(response.status).toBe(200);
    await response.json();
    expect(getRecentTracksRaw).toHaveBeenCalled();
    expect(getRecentTracks).not.toHaveBeenCalled();
  });

  it("should return 400 when page is less than 1", async () => {
    const request = new NextRequest("http://localhost/api/lastfm?page=0");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 when limit is out of range", async () => {
    const request = new NextRequest("http://localhost/api/lastfm?limit=0");
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when getRecentTracks throws", async () => {
    vi.mocked(getRecentTracks).mockRejectedValue(new Error("API down"));

    const request = new NextRequest("http://localhost/api/lastfm");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

describe("POST /api/lastfm/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMPORT_ADMIN_KEY = "test-admin-key";
    vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
    vi.mocked(isLastFmConfigured).mockReturnValue(true);
    vi.mocked(importLastFmTracks).mockResolvedValue({
      success: true,
      imported: 3,
      skipped: 0,
      errors: [],
      totalPages: 1,
      currentPage: 1,
      dryRun: false,
    });
  });

  it("should return 200 with import result", async () => {
    const request = new Request("http://localhost/api/lastfm/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({ userId: "user-1" }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.imported).toBe(3);
    expect(importLastFmTracks).toHaveBeenCalledWith("user-1", expect.any(Object));
  });

  it("should return 401 without auth session and admin key", async () => {
    const request = new Request("http://localhost/api/lastfm/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(401);
    expect(importLastFmTracks).not.toHaveBeenCalled();
  });

  it("should return 400 in admin mode when userId is missing", async () => {
    const request = new Request("http://localhost/api/lastfm/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({}),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(importLastFmTracks).not.toHaveBeenCalled();
  });

  it("should return 400 when limit is invalid", async () => {
    const request = new Request("http://localhost/api/lastfm/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({ userId: "user-1", limit: 500 }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(importLastFmTracks).not.toHaveBeenCalled();
  });

  it("should return 500 when importLastFmTracks throws", async () => {
    vi.mocked(importLastFmTracks).mockRejectedValue(new Error("Import failed"));

    const request = new Request("http://localhost/api/lastfm/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({ userId: "user-1" }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
