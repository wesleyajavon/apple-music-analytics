import { describe, it, expect } from "vitest";
import { estimateGroqChatTokens } from "../groq-rate-limiter";

describe("groq-rate-limiter", () => {
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
});
