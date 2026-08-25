import type { FriendshipDto } from "@/lib/dto/duet";
import type { NotificationItem } from "@/lib/context/notification-center-context";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import {
  duetFriendRequestSource,
  isDuetFriendRequestSource,
} from "@/lib/constants/duet-friend-request-notification";

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

function sortByNewest(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function isClientActivityNotification(item: NotificationItem): boolean {
  return !isDuetFriendRequestSource(item.source) && item.duetFriendRequest == null;
}

export function mergeNotificationItems(
  clientItems: NotificationItem[],
  serverDuetItems: NotificationItem[]
): NotificationItem[] {
  const withoutStaleDuet = clientItems.filter(
    (item) => !item.source?.startsWith("duet-friend-request:")
  );
  return [...sortByNewest(serverDuetItems), ...sortByNewest(withoutStaleDuet)];
}
