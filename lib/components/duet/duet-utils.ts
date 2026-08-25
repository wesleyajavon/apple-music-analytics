import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { DuetUserSummaryDto, FriendshipDto } from "@/lib/dto/duet";

export function getDuetDisplayName(user: DuetUserSummaryDto): string {
  return user.name?.trim() || user.email?.split("@")[0] || user.id.slice(0, 8);
}

export function getViewerDisplayName(input: {
  name?: string | null;
  email?: string | null;
  id: string;
}): string {
  return input.name?.trim() || input.email?.split("@")[0] || input.id.slice(0, 8);
}

export function resolveAuthAvatarUrl(authUser: SupabaseUser | null | undefined): string | null {
  const raw =
    (authUser?.user_metadata?.avatar_url as string | undefined) ??
    (authUser?.user_metadata?.picture as string | undefined);
  const trimmed = raw?.trim();
  return trimmed || null;
}

export function getDuetFriendFromFriendship(
  friendship: { requester: DuetUserSummaryDto; addressee: DuetUserSummaryDto },
  viewerId: string
): DuetUserSummaryDto {
  return friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
}

export function resolveAcceptedFriendName(
  friends: FriendshipDto[] | undefined,
  viewerId: string,
  friendUserId: string,
  fallback: string
): string {
  const friendship = friends?.find((row) => getDuetFriendFromFriendship(row, viewerId).id === friendUserId);
  if (!friendship) return fallback;
  return getDuetDisplayName(getDuetFriendFromFriendship(friendship, viewerId));
}
