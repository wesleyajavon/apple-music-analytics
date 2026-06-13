import { describe, expect, it } from "vitest";
import {
  buildDuetFriendRequestNotification,
  mergeNotificationItems,
} from "@/lib/utils/duet-friend-request-notifications";
import type { NotificationItem } from "@/lib/context/notification-center-context";
import type { FriendshipDto } from "@/lib/dto/duet";

const friendship: FriendshipDto = {
  id: "friendship-1",
  status: "pending",
  shareScope: "none",
  createdAt: "2026-06-10T12:00:00.000Z",
  respondedAt: null,
  direction: "incoming",
  requester: {
    id: "user-b",
    email: "b@test.com",
    name: "Bob",
    avatarUrl: null,
  },
  addressee: {
    id: "user-a",
    email: "a@test.com",
    name: "Alice",
    avatarUrl: null,
  },
};

describe("duet friend request notifications", () => {
  it("builds a server notification with link to friends page", () => {
    const item = buildDuetFriendRequestNotification(friendship);
    expect(item.read).toBe(false);
    expect(item.href).toBe("/dashboard/duet/friends?section=incoming");
    expect(item.source).toBe("duet-friend-request:friendship-1");
    expect(item.duetFriendRequest?.requesterName).toBe("Bob");
  });

  it("merges server items ahead of client items and strips stale duet client copies", () => {
    const serverItem = buildDuetFriendRequestNotification(friendship);
    const clientExport: NotificationItem = {
      id: "export-1",
      title: "Export done",
      createdAt: "2026-06-09T12:00:00.000Z",
      read: false,
      severity: "success",
      source: "export-csv",
    };
    const staleDuetClient: NotificationItem = {
      id: "old-duet",
      title: "Old",
      createdAt: "2026-06-08T12:00:00.000Z",
      read: true,
      source: "duet-friend-request:friendship-1",
    };

    const merged = mergeNotificationItems([clientExport, staleDuetClient], [serverItem]);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe("duet-server-friendship-1");
    expect(merged.some((n) => n.id === "old-duet")).toBe(false);
  });
});
