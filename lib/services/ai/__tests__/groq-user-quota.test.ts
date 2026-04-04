import { describe, it, expect, beforeEach } from "vitest";
import {
  tryConsumeGroqUserQuotaMemory,
  __resetGroqUserQuotaMemoryForTests,
} from "../groq-user-quota";

describe("groq-user-quota (memory)", () => {
  beforeEach(() => {
    __resetGroqUserQuotaMemoryForTests();
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
