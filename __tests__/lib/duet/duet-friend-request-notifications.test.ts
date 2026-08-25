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
    const clientImport: NotificationItem = {
      id: "import-1",
      title: "Import done",
      createdAt: "2026-06-11T12:00:00.000Z",
      read: false,
      severity: "success",
      source: "import-complete",
    };
    const staleDuetClient: NotificationItem = {
      id: "old-duet",
      title: "Old",
      createdAt: "2026-06-08T12:00:00.000Z",
      read: true,
      source: "duet-friend-request:friendship-1",
    };

    const merged = mergeNotificationItems([clientImport, staleDuetClient], [serverItem]);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.id).toBe("duet-server-friendship-1");
    expect(merged[1]?.id).toBe("import-1");
    expect(merged.some((n) => n.id === "old-duet")).toBe(false);
  });

  it("pins server duet items above newer client activity", () => {
    const serverItem = buildDuetFriendRequestNotification(friendship);
    const newerClient: NotificationItem = {
      id: "import-newer",
      title: "Import",
      createdAt: "2026-06-12T12:00:00.000Z",
      read: false,
      source: "import-complete",
    };

    const merged = mergeNotificationItems([newerClient], [serverItem]);
    expect(merged[0]?.id).toBe("duet-server-friendship-1");
    expect(merged[1]?.id).toBe("import-newer");
  });
});
