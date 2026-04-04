import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  tryConsumeGroqUserQuotaMemory,
  __resetGroqUserQuotaMemoryForTests,
  getUtcDayString,
  getGroqUserDailyQuotaLimit,
  isGroqUserQuotaEnabled,
  resolveGroqQuotaSubject,
  assertGroqUserQuotaForRequest,
} from "../groq-user-quota";

describe("groq-user-quota (memory)", () => {
  beforeEach(() => {
    __resetGroqUserQuotaMemoryForTests();
    delete process.env.GROQ_USER_DAILY_QUOTA;
    delete process.env.GROQ_USER_QUOTA_ENABLED;
  });

  afterEach(() => {
    delete process.env.GROQ_USER_DAILY_QUOTA;
    delete process.env.GROQ_USER_QUOTA_ENABLED;
  });

  it("allows up to limit then blocks", () => {
    expect(tryConsumeGroqUserQuotaMemory("u:test", 2)).toBe(true);
    expect(tryConsumeGroqUserQuotaMemory("u:test", 2)).toBe(true);
    expect(tryConsumeGroqUserQuotaMemory("u:test", 2)).toBe(false);
  });

  it("isolates subjects", () => {
    expect(tryConsumeGroqUserQuotaMemory("u:a", 1)).toBe(true);
    expect(tryConsumeGroqUserQuotaMemory("u:a", 1)).toBe(false);
    expect(tryConsumeGroqUserQuotaMemory("u:b", 1)).toBe(true);
  });
});

describe("groq-user-quota helpers", () => {
  beforeEach(() => {
    delete process.env.GROQ_USER_DAILY_QUOTA;
    delete process.env.GROQ_USER_QUOTA_ENABLED;
  });

  afterEach(() => {
    delete process.env.GROQ_USER_DAILY_QUOTA;
    delete process.env.GROQ_USER_QUOTA_ENABLED;
  });

  it("getUtcDayString returns YYYY-MM-DD", () => {
    expect(getUtcDayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("getGroqUserDailyQuotaLimit defaults to 40 and parses env", () => {
    expect(getGroqUserDailyQuotaLimit()).toBe(40);
    process.env.GROQ_USER_DAILY_QUOTA = "12";
    expect(getGroqUserDailyQuotaLimit()).toBe(12);
    process.env.GROQ_USER_DAILY_QUOTA = "nope";
    expect(getGroqUserDailyQuotaLimit()).toBe(40);
  });

  it("isGroqUserQuotaEnabled respects zero limit and explicit false", () => {
    expect(isGroqUserQuotaEnabled()).toBe(true);
    process.env.GROQ_USER_DAILY_QUOTA = "0";
    expect(isGroqUserQuotaEnabled()).toBe(false);
    process.env.GROQ_USER_DAILY_QUOTA = "10";
    process.env.GROQ_USER_QUOTA_ENABLED = "false";
    expect(isGroqUserQuotaEnabled()).toBe(false);
  });

  it("resolveGroqQuotaSubject prefers query userId then body then IP headers", () => {
    expect(
      resolveGroqQuotaSubject(
        new NextRequest("http://localhost/api?userId=abc")
      )
    ).toBe("u:abc");
    expect(
      resolveGroqQuotaSubject(new NextRequest("http://localhost/api"), "xyz")
    ).toBe("u:xyz");
    expect(
      resolveGroqQuotaSubject(
        new NextRequest("http://localhost/api", {
          headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
        })
      )
    ).toBe("ip:10.0.0.1");
    expect(
      resolveGroqQuotaSubject(
        new NextRequest("http://localhost/api", {
          headers: { "x-real-ip": " 1.2.3.4 " },
        })
      )
    ).toBe("ip:1.2.3.4");
    expect(
      resolveGroqQuotaSubject(
        new NextRequest("http://localhost/api", {
          headers: { "cf-connecting-ip": "5.6.7.8" },
        })
      )
    ).toBe("ip:5.6.7.8");
    expect(
      resolveGroqQuotaSubject(new NextRequest("http://localhost/api"))
    ).toBe(null);
  });

  it("assertGroqUserQuotaForRequest no-ops when quota disabled", async () => {
    process.env.GROQ_USER_DAILY_QUOTA = "0";
    await assertGroqUserQuotaForRequest(
      new NextRequest("http://localhost/api?userId=u1")
    );
  });

  it("assertGroqUserQuotaForRequest no-ops when subject cannot be resolved", async () => {
    process.env.GROQ_USER_DAILY_QUOTA = "40";
    process.env.GROQ_USER_QUOTA_ENABLED = "true";
    await assertGroqUserQuotaForRequest(new NextRequest("http://localhost/api"));
  });
});
