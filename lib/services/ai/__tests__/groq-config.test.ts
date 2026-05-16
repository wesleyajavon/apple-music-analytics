import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getGroqTpmLimit,
  getGroqRpmLimit,
  getGroqTpmSafetyFactor,
  getGroqEffectiveTpmBudget,
  getGroqEffectiveRpmBudget,
  isGroqRateLimitEnabled,
} from "../groq-config";

describe("groq-config", () => {
  beforeEach(() => {
    delete process.env.GROQ_TPM_LIMIT;
    delete process.env.GROQ_RPM_LIMIT;
    delete process.env.GROQ_TPM_SAFETY;
    delete process.env.GROQ_RATE_LIMIT_ENABLED;
  });

  afterEach(() => {
    delete process.env.GROQ_TPM_LIMIT;
    delete process.env.GROQ_RPM_LIMIT;
    delete process.env.GROQ_TPM_SAFETY;
    delete process.env.GROQ_RATE_LIMIT_ENABLED;
  });

  it("getGroqTpmLimit defaults and parses valid env", () => {
    expect(getGroqTpmLimit()).toBe(6000);
    process.env.GROQ_TPM_LIMIT = "8000";
    expect(getGroqTpmLimit()).toBe(8000);
    process.env.GROQ_TPM_LIMIT = "not-a-number";
    expect(getGroqTpmLimit()).toBe(6000);
    process.env.GROQ_TPM_LIMIT = "0";
    expect(getGroqTpmLimit()).toBe(6000);
  });

  it("getGroqRpmLimit defaults and parses valid env", () => {
    expect(getGroqRpmLimit()).toBe(30);
    process.env.GROQ_RPM_LIMIT = "60";
    expect(getGroqRpmLimit()).toBe(60);
    process.env.GROQ_RPM_LIMIT = "nope";
    expect(getGroqRpmLimit()).toBe(30);
    process.env.GROQ_RPM_LIMIT = "0";
    expect(getGroqRpmLimit()).toBe(30);
  });

  it("getGroqTpmSafetyFactor defaults and clamps", () => {
    expect(getGroqTpmSafetyFactor()).toBeCloseTo(0.72);
    process.env.GROQ_TPM_SAFETY = "0.5";
    expect(getGroqTpmSafetyFactor()).toBe(0.5);
    process.env.GROQ_TPM_SAFETY = "2";
    expect(getGroqTpmSafetyFactor()).toBeCloseTo(0.72);
    process.env.GROQ_TPM_SAFETY = "-1";
    expect(getGroqTpmSafetyFactor()).toBeCloseTo(0.72);
  });

  it("getGroqEffectiveTpmBudget multiplies limit by safety", () => {
    process.env.GROQ_TPM_LIMIT = "1000";
    process.env.GROQ_TPM_SAFETY = "0.5";
    expect(getGroqEffectiveTpmBudget()).toBe(500);
  });

  it("getGroqEffectiveRpmBudget multiplies RPM limit by safety", () => {
    process.env.GROQ_RPM_LIMIT = "100";
    process.env.GROQ_TPM_SAFETY = "0.5";
    expect(getGroqEffectiveRpmBudget()).toBe(50);
  });

  it("getGroqEffectiveTpmBudget is at least 1", () => {
    process.env.GROQ_TPM_LIMIT = "1";
    process.env.GROQ_TPM_SAFETY = "0.1";
    expect(getGroqEffectiveTpmBudget()).toBe(1);
  });

  it("isGroqRateLimitEnabled is false only when env is the string false", () => {
    expect(isGroqRateLimitEnabled()).toBe(true);
    process.env.GROQ_RATE_LIMIT_ENABLED = "false";
    expect(isGroqRateLimitEnabled()).toBe(false);
  });
});
