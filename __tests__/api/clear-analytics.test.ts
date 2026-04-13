import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/user/clear-analytics/route";

vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 4,
    resetAt: new Date().toISOString(),
  }),
}));

vi.mock("@/lib/services/user/clear-user-analytics-data", () => ({
  clearUserAnalyticsData: vi.fn(),
}));

vi.mock("@/lib/services/predictions/prediction-cache", () => ({
  invalidateListeningHabitPredictionForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { clearUserAnalyticsData } from "@/lib/services/user/clear-user-analytics-data";
import { invalidateListeningHabitPredictionForUser } from "@/lib/services/predictions/prediction-cache";
import { prisma } from "@/lib/prisma";

describe("GET /api/user/clear-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user-abc");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
    const request = new NextRequest("http://localhost/api/user/clear-analytics");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns phrase derived from user name", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "Jane Marie Doe",
      email: "ignored@example.com",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    const request = new NextRequest("http://localhost/api/user/clear-analytics");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.phrase).toBe("jane-doe");
  });

  it("returns 409 when no phrase can be built", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: null,
      email: null,
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);

    const request = new NextRequest("http://localhost/api/user/clear-analytics");
    const response = await GET(request);
    expect(response.status).toBe(409);
  });
});

describe("POST /api/user/clear-analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user-abc");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      name: "John Doe",
      email: "john@example.com",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
    vi.mocked(clearUserAnalyticsData).mockResolvedValue({
      listensDeleted: 12,
      replayYearsDeleted: 1,
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
    const request = new NextRequest("http://localhost/api/user/clear-analytics", {
      method: "POST",
      body: JSON.stringify({ confirm: true, phrase: "john-doe" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(clearUserAnalyticsData).not.toHaveBeenCalled();
  });

  it("returns 400 when confirm is not true or phrase missing", async () => {
    const request = new NextRequest("http://localhost/api/user/clear-analytics", {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(clearUserAnalyticsData).not.toHaveBeenCalled();
  });

  it("returns 400 when phrase does not match", async () => {
    const request = new NextRequest("http://localhost/api/user/clear-analytics", {
      method: "POST",
      body: JSON.stringify({ confirm: true, phrase: "wrong" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe("PHRASE_MISMATCH");
    expect(clearUserAnalyticsData).not.toHaveBeenCalled();
  });

  it("returns 200 and clears data when phrase matches", async () => {
    const request = new NextRequest("http://localhost/api/user/clear-analytics", {
      method: "POST",
      body: JSON.stringify({ confirm: true, phrase: "John-Doe" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.listensDeleted).toBe(12);
    expect(clearUserAnalyticsData).toHaveBeenCalledWith("user-abc");
    expect(invalidateListeningHabitPredictionForUser).toHaveBeenCalledWith("user-abc");
  });
});
