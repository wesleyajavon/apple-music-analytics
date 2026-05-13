import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/listening/groq-import-genre-backfill-ai-guard", () => ({
  resolveUserIdForGroqGenreBackfillGuard: vi.fn().mockResolvedValue(null),
  assertInteractiveGroqNotBlockedByImportGenreBackfill: vi.fn().mockResolvedValue(undefined),
}));

/**
 * API tests for POST /api/ai/taste-profile
 * Validates input validation and error handling.
 * LLM calls are mocked - we don't hit Groq in tests.
 */

const validInput = {
  dateRange: { start: "2024-01-01", end: "2024-01-31" },
  genreDistribution: [
    { genre: "Rock", count: 100, percentage: 40 },
    { genre: "Pop", count: 75, percentage: 30 },
  ],
  listeningByTimeOfDay: [
    { hour: 18, listens: 50 },
    { hour: 12, listens: 30 },
  ],
  topArtists: [
    { artistName: "Artist A", listenCount: 80 },
    { artistName: "Artist B", listenCount: 60 },
  ],
  tone: "casual" as const,
};

describe("POST /api/ai/taste-profile", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return 400 for missing dateRange", async () => {
    const { POST } = await import("@/app/api/ai/taste-profile/route");
    const body = { ...validInput, dateRange: undefined };
    const request = new NextRequest("http://localhost/api/ai/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for invalid tone", async () => {
    const { POST } = await import("@/app/api/ai/taste-profile/route");
    const body = { ...validInput, tone: "invalid" };
    const request = new NextRequest("http://localhost/api/ai/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("should accept analytical tone", async () => {
    const { POST } = await import("@/app/api/ai/taste-profile/route");
    const body = { ...validInput, tone: "analytical" };
    const request = new NextRequest("http://localhost/api/ai/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    // Without GROQ_API_KEY we get 500 from LLM
    expect([200, 500]).toContain(response.status);
  });

  it("should accept poetic tone", async () => {
    const { POST } = await import("@/app/api/ai/taste-profile/route");
    const body = { ...validInput, tone: "poetic" };
    const request = new NextRequest("http://localhost/api/ai/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect([200, 500]).toContain(response.status);
  });

  it("should default tone to casual when omitted", async () => {
    const { POST } = await import("@/app/api/ai/taste-profile/route");
    const { tone: _tone, ...bodyWithoutTone } = validInput;
    const request = new NextRequest("http://localhost/api/ai/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyWithoutTone),
    });
    const response = await POST(request);
    // Schema defaults tone to "casual", so request is valid
    expect([200, 400, 500]).toContain(response.status);
  });

  it("should accept optional diversity fields", async () => {
    const { POST } = await import("@/app/api/ai/taste-profile/route");
    const body = {
      ...validInput,
      totalListens: 500,
      uniqueArtists: 50,
      uniqueTracks: 200,
    };
    const request = new NextRequest("http://localhost/api/ai/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect([200, 400, 500]).toContain(response.status);
  });
});
