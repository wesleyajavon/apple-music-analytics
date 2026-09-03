import { describe, expect, it } from "vitest";
import { resolveClientAiUnavailableReason } from "@/lib/utils/ai-unavailable-reason";

describe("resolveClientAiUnavailableReason", () => {
  it("returns env when the server kill-switch is on", () => {
    expect(
      resolveClientAiUnavailableReason({ enabled: false, envLocked: true, consentRequired: false }),
    ).toBe("env");
  });

  it("returns consent when Groq opt-in is missing", () => {
    expect(
      resolveClientAiUnavailableReason({ enabled: false, envLocked: false, consentRequired: true }),
    ).toBe("consent");
  });

  it("returns client when the browser toggle is off", () => {
    expect(
      resolveClientAiUnavailableReason({ enabled: false, envLocked: false, consentRequired: false }),
    ).toBe("client");
  });

  it("returns null when AI is fully enabled", () => {
    expect(
      resolveClientAiUnavailableReason({ enabled: true, envLocked: false, consentRequired: false }),
    ).toBeNull();
  });
});
