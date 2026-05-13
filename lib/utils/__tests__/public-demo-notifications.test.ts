import { describe, expect, it } from "vitest";
import { shouldHideNotificationCenterForPublicDemo } from "@/lib/utils/public-demo-notifications";

const PID = "11111111-1111-4111-8111-111111111111";

describe("shouldHideNotificationCenterForPublicDemo", () => {
  it("returns false when public profile is disabled", () => {
    expect(shouldHideNotificationCenterForPublicDemo(null, PID, null)).toBe(false);
  });

  it("returns false when URL userId does not match public profile", () => {
    expect(shouldHideNotificationCenterForPublicDemo(PID, "other-uuid", null)).toBe(false);
  });

  it("returns true while auth is unresolved and URL matches public id (pessimistic)", () => {
    expect(shouldHideNotificationCenterForPublicDemo(PID, PID, undefined)).toBe(true);
  });

  it("returns true for anonymous viewer with matching userId", () => {
    expect(shouldHideNotificationCenterForPublicDemo(PID, PID, null)).toBe(true);
  });

  it("returns false when user is signed in, even on public profile URL", () => {
    expect(shouldHideNotificationCenterForPublicDemo(PID, PID, "user-auth-id")).toBe(
      false
    );
  });
});
