/**
 * Tests d'intégration pour GET /api/replay et POST /api/replay/import
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/replay/route";
import { POST as POSTImport } from "@/app/api/replay/import/route";

vi.mock("@/lib/services/replay/replay-service", () => ({
  getReplayYearlySummaries: vi.fn(),
  importReplayYearly: vi.fn(),
}));
vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));

import {
  getReplayYearlySummaries,
  importReplayYearly,
} from "@/lib/services/replay/replay-service";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";

describe("GET /api/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(getReplayYearlySummaries).mockResolvedValue([]);
  });

  it("should return 200 with summaries", async () => {
    vi.mocked(getReplayYearlySummaries).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/replay");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(getReplayYearlySummaries).toHaveBeenCalledWith("user-1");
  });

  it("should ignore query userId and use authenticated user", async () => {
    const request = new NextRequest(
      "http://localhost/api/replay?userId=custom-user"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getReplayYearlySummaries).toHaveBeenCalledWith("user-1");
  });

  it("should return 500 when getReplayYearlySummaries throws", async () => {
    vi.mocked(getReplayYearlySummaries).mockRejectedValue(new Error("DB error"));

    const request = new NextRequest("http://localhost/api/replay");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

describe("POST /api/replay/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IMPORT_ADMIN_KEY = "test-admin-key";
    vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
    vi.mocked(importReplayYearly).mockResolvedValue({
      success: true,
      replayYearlyId: "ry-1",
    });
  });

  it("should return 200 on successful import", async () => {
    const request = new Request("http://localhost/api/replay/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({
        userId: "user-1",
        data: { year: 2024, topTracks: [] },
      }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.replayYearlyId).toBe("ry-1");
    expect(importReplayYearly).toHaveBeenCalledWith("user-1", {
      year: 2024,
      topTracks: [],
    });
  });

  it("should return 401 without auth session and admin key", async () => {
    const request = new Request("http://localhost/api/replay/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: {} }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(401);
    expect(importReplayYearly).not.toHaveBeenCalled();
  });

  it("should return 400 in admin mode when userId is missing", async () => {
    const request = new Request("http://localhost/api/replay/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({ data: {} }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(importReplayYearly).not.toHaveBeenCalled();
  });

  it("should return 400 when data is missing", async () => {
    const request = new Request("http://localhost/api/replay/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({ userId: "user-1" }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
    expect(importReplayYearly).not.toHaveBeenCalled();
  });

  it("should return 400 when importReplayYearly returns success false", async () => {
    vi.mocked(importReplayYearly).mockResolvedValue({
      success: false,
      validationErrors: [{ field: "year", message: "invalid" }],
      errors: [],
    });

    const request = new Request("http://localhost/api/replay/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({
        userId: "user-1",
        data: { year: 2024 },
      }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("should return 500 when importReplayYearly throws", async () => {
    vi.mocked(importReplayYearly).mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost/api/replay/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-import-admin-key": "test-admin-key",
      },
      body: JSON.stringify({
        userId: "user-1",
        data: { year: 2024 },
      }),
    });
    const response = await POSTImport(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});
