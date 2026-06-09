import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/get-current-user-id", () => ({
  getCurrentUserId: vi.fn(),
}));

vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));

vi.mock("@/lib/security/analytics-rate-limit", () => ({
  assertAnalyticsRateLimit: vi.fn(),
}));

vi.mock("@/lib/services/ai/groq-user-quota", () => ({
  assertGroqUserQuotaForRequest: vi.fn(),
}));

vi.mock("@/lib/services/listening/groq-import-genre-backfill-ai-guard", () => ({
  assertInteractiveGroqNotBlockedByImportGenreBackfill: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/ai/ai-master", () => ({
  AI_MASTER_DISABLED_COOKIE: "ai-master-disabled",
  isAiMasterEnvEnabled: vi.fn(() => true),
}));

vi.mock("@/lib/services/ai/groq-ai-request-guard", () => ({
  getGroqAiUnavailableReason: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/ai/music-chat-service", () => ({
  generateMusicChatAnswer: vi.fn(),
}));

import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import { assertGroqUserQuotaForRequest } from "@/lib/services/ai/groq-user-quota";
import { generateMusicChatAnswer } from "@/lib/services/ai/music-chat-service";
import { POST } from "@/app/api/ai/music-chat/route";

function makeRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/music-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue(undefined);
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "public-user",
    });
    vi.mocked(generateMusicChatAnswer).mockResolvedValue({
      answer: "Mock answer",
      sources: [],
      locale: "en",
    });
  });

  it("blocks anonymous public demo free text", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/ai/music-chat?userId=public-user", {
        messages: [{ role: "user", content: "Tell me everything" }],
        locale: "en",
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      code: "PUBLIC_DEMO_PRESET_REQUIRED",
    });
    expect(assertAnalyticsRateLimit).not.toHaveBeenCalled();
    expect(generateMusicChatAnswer).not.toHaveBeenCalled();
  });

  it("rejects anonymous public demo requests outside preset ids", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/ai/music-chat?userId=public-user", {
        messages: [],
        locale: "en",
        presetQuestionId: "anything-goes",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(assertAnalyticsRateLimit).not.toHaveBeenCalled();
    expect(generateMusicChatAnswer).not.toHaveBeenCalled();
  });

  it("allows anonymous public demo preset questions", async () => {
    const response = await POST(
      makeRequest("http://localhost/api/ai/music-chat?userId=public-user", {
        messages: [],
        locale: "en",
        presetQuestionId: "summer-2022-top-tracks",
      })
    );

    expect(response.status).toBe(200);
    expect(assertAnalyticsRateLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ route: "/api/ai/music-chat" }),
      "public-user"
    );
    expect(assertGroqUserQuotaForRequest).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "public-user"
    );
    expect(generateMusicChatAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "public-user",
        locale: "en",
        presetQuestionId: "summer-2022-top-tracks",
      })
    );
  });

  it("allows authenticated free text", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("session-user");
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: "session-user",
    });

    const response = await POST(
      makeRequest("http://localhost/api/ai/music-chat", {
        messages: [{ role: "user", content: "Who is my most consistent artist?" }],
        locale: "en",
      })
    );

    expect(response.status).toBe(200);
    expect(generateMusicChatAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "session-user",
        messages: [{ role: "user", content: "Who is my most consistent artist?" }],
      })
    );
  });
});
