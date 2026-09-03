import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { AI_MASTER_DISABLED_COOKIE } from "@/lib/services/ai/ai-master";

vi.mock("@/lib/services/user/privacy-preferences", () => ({
  hasGroqGenreConsent: vi.fn(),
}));

import { hasGroqGenreConsent } from "@/lib/services/user/privacy-preferences";
import {
  getGroqAiUnavailableReason,
  getGroqFeatureUnavailableReason,
  isGroqAiEnabledForRequest,
} from "@/lib/services/ai/groq-ai-request-guard";

describe("groq-ai-request-guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_MASTER_ENABLED;
  });

  it("returns env when AI_MASTER_ENABLED is false", async () => {
    process.env.AI_MASTER_ENABLED = "false";
    const request = new NextRequest("http://localhost/api/ai/insights");
    await expect(getGroqAiUnavailableReason(request, "user-1")).resolves.toBe("env");
  });

  it("returns client when ai_master_disabled cookie is set", async () => {
    vi.mocked(hasGroqGenreConsent).mockResolvedValue(true);
    const request = new NextRequest("http://localhost/api/ai/insights", {
      headers: { cookie: `${AI_MASTER_DISABLED_COOKIE}=1` },
    });
    await expect(getGroqAiUnavailableReason(request, "user-1")).resolves.toBe("client");
  });

  it("returns consent when user has not opted in", async () => {
    vi.mocked(hasGroqGenreConsent).mockResolvedValue(false);
    const request = new NextRequest("http://localhost/api/ai/insights");
    await expect(getGroqAiUnavailableReason(request, "user-1")).resolves.toBe("consent");
  });

  it("returns null when env, cookie, and consent all allow AI", async () => {
    vi.mocked(hasGroqGenreConsent).mockResolvedValue(true);
    const request = new NextRequest("http://localhost/api/ai/insights");
    await expect(isGroqAiEnabledForRequest(request, "user-1")).resolves.toBe(true);
    await expect(getGroqAiUnavailableReason(request, "user-1")).resolves.toBeNull();
  });

  it("treats a missing GROQ_API_KEY as env unavailability", async () => {
    vi.mocked(hasGroqGenreConsent).mockResolvedValue(true);
    const previous = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const request = new NextRequest("http://localhost/api/ai/insights");
    await expect(getGroqFeatureUnavailableReason(request, "user-1")).resolves.toBe("env");
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  });
});
