import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  estimateGroqChatTokens,
  acquireGroqTokens,
} from "../groq-rate-limiter";

describe("groq-rate-limiter", () => {
  beforeEach(() => {
    delete process.env.GROQ_RATE_LIMIT_ENABLED;
  });

  afterEach(() => {
    delete process.env.GROQ_RATE_LIMIT_ENABLED;
  });

  it("estimateGroqChatTokens sums input (char/4) and max_tokens", () => {
    expect(
      estimateGroqChatTokens({
        messages: [
          { role: "system", content: "a".repeat(400) },
          { role: "user", content: "b".repeat(400) },
        ],
        max_tokens: 100,
      })
    ).toBe(200 + 100);
  });

  it("defaults max_tokens to 500 when omitted", () => {
    expect(
      estimateGroqChatTokens({
        messages: [{ role: "user", content: "" }],
      })
    ).toBe(500);
  });

  it("estimateGroqChatTokens counts text parts in content arrays", () => {
    expect(
      estimateGroqChatTokens({
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "x".repeat(400) }],
          },
        ],
        max_tokens: 0,
      })
    ).toBe(100);
  });

  it("acquireGroqTokens returns immediately when rate limit is disabled", async () => {
    process.env.GROQ_RATE_LIMIT_ENABLED = "false";
    await acquireGroqTokens(50_000);
  });
});
