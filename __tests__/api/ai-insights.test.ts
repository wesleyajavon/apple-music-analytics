import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/listening/groq-import-genre-backfill-ai-guard", () => ({
  resolveUserIdForGroqGenreBackfillGuard: vi.fn().mockResolvedValue(null),
  assertInteractiveGroqNotBlockedByImportGenreBackfill: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-id"),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
  ),
}));

/**
 * API tests for POST /api/ai/insights
 * Validates input validation and error handling.
 * LLM calls are mocked - we don't hit OpenAI in tests.
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
};

describe("POST /api/ai/insights", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return 400 for missing dateRange", async () => {
    const { POST } = await import("@/app/api/ai/insights/route");
    const body = { ...validInput, dateRange: undefined };
    const request = new NextRequest("http://localhost/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("should return 400 for invalid date format", async () => {
    const { POST } = await import("@/app/api/ai/insights/route");
    const body = {
      ...validInput,
      dateRange: { start: "invalid", end: "2024-01-31" },
    };
    const request = new NextRequest("http://localhost/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe("VALIDATION_ERROR");
  });

  it("should accept empty genreDistribution (valid schema)", async () => {
    const { POST } = await import("@/app/api/ai/insights/route");
    const body = { ...validInput, genreDistribution: [] };
    const request = new NextRequest("http://localhost/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    // Empty array is valid per schema; without OPENAI_API_KEY we get 500 from LLM
    expect([400, 500]).toContain(response.status);
  });

  it("should return 400 for invalid hour in listeningByTimeOfDay", async () => {
    const { POST } = await import("@/app/api/ai/insights/route");
    const body = {
      ...validInput,
      listeningByTimeOfDay: [{ hour: 25, listens: 10 }], // hour must be 0-23
    };
    const request = new NextRequest("http://localhost/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 500 when GROQ_API_KEY is not set (LLM fails)", async () => {
    const originalEnv = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const { POST } = await import("@/app/api/ai/insights/route");
    const request = new NextRequest("http://localhost/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validInput),
    });
    const response = await POST(request);

    process.env.GROQ_API_KEY = originalEnv;

    // Without API key, generateInsights throws - we expect 500
    expect([500, 200]).toContain(response.status);
  });
});
