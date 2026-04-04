import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api-client";
import {
  getGroqQuotaUserFacingMessage,
  isGroqDailyQuotaError,
} from "@/lib/utils/groq-quota-message";

describe("groq-quota-message", () => {
  const t = (key: string, values?: Record<string, string | number>) =>
    values
      ? `${key}:${JSON.stringify(values)}`
      : key;

  it("isGroqDailyQuotaError is true only for ApiError with code", () => {
    expect(isGroqDailyQuotaError(new ApiError(429, "x", "GROQ_DAILY_QUOTA_EXCEEDED"))).toBe(
      true
    );
    expect(isGroqDailyQuotaError(new ApiError(429, "x", "OTHER"))).toBe(false);
    expect(isGroqDailyQuotaError(new Error("x"))).toBe(false);
  });

  it("getGroqQuotaUserFacingMessage returns null for non-quota errors", () => {
    expect(getGroqQuotaUserFacingMessage(new Error("x"), t, "en-US")).toBeNull();
  });

  it("getGroqQuotaUserFacingMessage uses detailed template when details present", () => {
    const err = new ApiError(429, "limit", "GROQ_DAILY_QUOTA_EXCEEDED", {
      limit: 40,
      resetAtUtc: "2026-01-15T00:00:00.000Z",
    });
    const msg = getGroqQuotaUserFacingMessage(err, t, "en-US");
    expect(msg).toContain("groqDailyQuotaExceededDetailed");
    expect(msg).toContain("40");
  });

  it("getGroqQuotaUserFacingMessage falls back when details incomplete", () => {
    const err = new ApiError(429, "limit", "GROQ_DAILY_QUOTA_EXCEEDED", {});
    expect(getGroqQuotaUserFacingMessage(err, t, "en-US")).toBe(
      "groqDailyQuotaExceeded"
    );
  });
});
