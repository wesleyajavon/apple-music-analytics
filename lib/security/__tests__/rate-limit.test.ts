import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  __resetRateLimitMemoryForTests,
  checkRateLimit,
} from "@/lib/security/rate-limit";

const ORIGINAL_ENV = process.env.NODE_ENV;
const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

describe("rate-limit", () => {
  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.REDIS_URL;
    __resetRateLimitMemoryForTests();
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_ENV;
    if (ORIGINAL_REDIS_URL) {
      process.env.REDIS_URL = ORIGINAL_REDIS_URL;
    } else {
      delete process.env.REDIS_URL;
    }
    __resetRateLimitMemoryForTests();
    vi.restoreAllMocks();
  });

  it("allows requests under maxRequests", async () => {
    const request = new NextRequest("http://localhost/api/export/listens");
    const config = {
      route: "/api/export/listens",
      userId: "user-1",
      windowMs: 60_000,
      maxRequests: 2,
    };

    const first = await checkRateLimit(request, config);
    const second = await checkRateLimit(request, config);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("denies when maxRequests is exceeded in same window", async () => {
    const request = new NextRequest("http://localhost/api/export/stats");
    const config = {
      route: "/api/export/stats",
      userId: "user-2",
      windowMs: 60_000,
      maxRequests: 1,
    };

    const first = await checkRateLimit(request, config);
    const second = await checkRateLimit(request, config);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.remaining).toBe(0);
  });

  it("resets after window expiration", async () => {
    const request = new NextRequest("http://localhost/api/replay/import");
    const config = {
      route: "/api/replay/import",
      userId: "user-3",
      windowMs: 1_000,
      maxRequests: 1,
    };

    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1_000);
    const first = await checkRateLimit(request, config);

    nowSpy.mockReturnValueOnce(1_500);
    const second = await checkRateLimit(request, config);

    nowSpy.mockReturnValueOnce(2_500);
    const third = await checkRateLimit(request, config);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });
});
