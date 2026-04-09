import { describe, expect, it } from "vitest";
import { parseRateLimitHeaders } from "@/lib/api-client";

describe("parseRateLimitHeaders", () => {
  it("parses standard rate-limit headers", () => {
    const headers = new Headers({
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "7",
      "X-RateLimit-Reset": "1712668800",
      "Retry-After": "12",
    });

    const parsed = parseRateLimitHeaders(headers);

    expect(parsed.limit).toBe(10);
    expect(parsed.remaining).toBe(7);
    expect(parsed.resetAt?.toISOString()).toBe("2024-04-09T13:20:00.000Z");
    expect(parsed.retryAfterSeconds).toBe(12);
  });

  it("returns undefined fields when headers are missing", () => {
    const parsed = parseRateLimitHeaders(new Headers());

    expect(parsed.limit).toBeUndefined();
    expect(parsed.remaining).toBeUndefined();
    expect(parsed.resetAt).toBeUndefined();
    expect(parsed.retryAfterSeconds).toBeUndefined();
  });
});
