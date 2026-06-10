import type { DuetUserSummaryDto } from "@/lib/dto/duet";

export function getDuetDisplayName(user: DuetUserSummaryDto): string {
  return user.name?.trim() || user.email?.split("@")[0] || user.id.slice(0, 8);
}

export function getDuetFriendFromFriendship(
  friendship: { requester: DuetUserSummaryDto; addressee: DuetUserSummaryDto },
  viewerId: string
): DuetUserSummaryDto {
  return friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
}
