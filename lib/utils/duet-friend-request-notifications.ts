import type { FriendshipDto } from "@/lib/dto/duet";
import type { NotificationItem } from "@/lib/context/notification-center-context";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { duetFriendRequestSource } from "@/lib/constants/duet-friend-request-notification";

export function buildDuetFriendRequestNotification(
  friendship: FriendshipDto
): NotificationItem {
  const requesterName = getDuetDisplayName(friendship.requester);
  return {
    id: `duet-server-${friendship.id}`,
    title: requesterName,
    createdAt: friendship.createdAt,
    read: false,
    severity: "info",
    href: "/dashboard/duet/friends?section=incoming",
    source: duetFriendRequestSource(friendship.id),
    duetFriendRequest: {
      friendshipId: friendship.id,
      requesterName,
    },
  };
}

export function mergeNotificationItems(
  clientItems: NotificationItem[],
  serverDuetItems: NotificationItem[]
): NotificationItem[] {
  const withoutStaleDuet = clientItems.filter(
    (item) => !item.source?.startsWith("duet-friend-request:")
  );
  return [...serverDuetItems, ...withoutStaleDuet].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
