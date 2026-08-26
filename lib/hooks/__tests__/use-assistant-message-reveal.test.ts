import { describe, expect, it } from "vitest";
import { getAssistantRevealDurationMs } from "@/lib/hooks/use-assistant-message-reveal";

describe("getAssistantRevealDurationMs", () => {
  it("returns 0 for empty content", () => {
    expect(getAssistantRevealDurationMs(0)).toBe(0);
  });

  it("keeps short answers readable and long answers under 4s", () => {
    expect(getAssistantRevealDurationMs(40)).toBe(550);
    expect(getAssistantRevealDurationMs(400)).toBe(1280);
    expect(getAssistantRevealDurationMs(20_000)).toBe(3800);
  });
});
