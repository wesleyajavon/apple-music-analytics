import { describe, expect, it } from "vitest";
import { buildCompareFriendHref } from "@/lib/utils/duet-compare-href";

describe("buildCompareFriendHref", () => {
  it("sets friendUserId and keeps date filters plus entity deep-link keys", () => {
    const current = new URLSearchParams(
      "preset=30d&startDate=2026-01-01&endDate=2026-01-31&section=target&arenaMode=artist&entityType=artist&entityId=abc&entityName=Daft+Punk&userId=public"
    );

    const href = buildCompareFriendHref("/dashboard/duet/compare", current, "friend-1");

    expect(href).toContain("/dashboard/duet/compare?");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("friendUserId")).toBe("friend-1");
    expect(params.get("preset")).toBe("30d");
    expect(params.get("startDate")).toBe("2026-01-01");
    expect(params.get("endDate")).toBe("2026-01-31");
    expect(params.get("section")).toBe("target");
    expect(params.get("arenaMode")).toBe("artist");
    expect(params.get("entityType")).toBe("artist");
    expect(params.get("entityId")).toBe("abc");
    expect(params.get("entityName")).toBe("Daft Punk");
    expect(params.get("userId")).toBe("public");
  });

  it("overwrites an existing friendUserId without dropping other keys", () => {
    const current = new URLSearchParams("friendUserId=old&period=month&entityId=xyz");
    const href = buildCompareFriendHref("/en/dashboard/duet/compare", current, "new-friend");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("friendUserId")).toBe("new-friend");
    expect(params.get("period")).toBe("month");
    expect(params.get("entityId")).toBe("xyz");
  });
});
