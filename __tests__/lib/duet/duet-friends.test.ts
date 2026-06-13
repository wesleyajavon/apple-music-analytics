import { describe, expect, it } from "vitest";
import {
  isDuetFriendsSection,
  paginateList,
  parseDuetFriendsPageSize,
  resolveDefaultDuetFriendsSection,
} from "@/lib/constants/duet-friends";

describe("duet-friends constants", () => {
  it("validates section ids", () => {
    expect(isDuetFriendsSection("friends")).toBe(true);
    expect(isDuetFriendsSection("invite")).toBe(true);
    expect(isDuetFriendsSection("unknown")).toBe(false);
    expect(isDuetFriendsSection(null)).toBe(false);
  });

  it("parses allowed page sizes with fallback", () => {
    expect(parseDuetFriendsPageSize("5")).toBe(5);
    expect(parseDuetFriendsPageSize("99")).toBe(10);
    expect(parseDuetFriendsPageSize(null)).toBe(10);
  });

  it("prioritizes incoming requests for default section", () => {
    expect(
      resolveDefaultDuetFriendsSection({ friends: 2, pendingIncoming: 1, pendingOutgoing: 3 })
    ).toBe("incoming");
    expect(
      resolveDefaultDuetFriendsSection({ friends: 2, pendingIncoming: 0, pendingOutgoing: 3 })
    ).toBe("friends");
    expect(
      resolveDefaultDuetFriendsSection({ friends: 0, pendingIncoming: 0, pendingOutgoing: 2 })
    ).toBe("outgoing");
    expect(
      resolveDefaultDuetFriendsSection({ friends: 0, pendingIncoming: 0, pendingOutgoing: 0 })
    ).toBe("invite");
  });

  it("paginates lists with safe page bounds", () => {
    const items = Array.from({ length: 12 }, (_, index) => index + 1);
    expect(paginateList(items, 2, 5)).toMatchObject({
      items: [6, 7, 8, 9, 10],
      total: 12,
      totalPages: 3,
      page: 2,
      pageStart: 6,
      pageEnd: 10,
      hasMore: true,
    });
    expect(paginateList(items, 99, 5).page).toBe(3);
    expect(paginateList([], 2, 5)).toMatchObject({
      items: [],
      total: 0,
      totalPages: 1,
      page: 1,
      pageStart: 0,
      pageEnd: 0,
      hasMore: false,
    });
  });
});
