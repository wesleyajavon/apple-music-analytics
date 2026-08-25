import { describe, expect, it } from "vitest";
import type { FriendshipDto } from "@/lib/dto/duet";
import { resolveAcceptedFriendName } from "@/lib/components/duet/duet-utils";

function friendUser(id: string, name: string | null): FriendshipDto["requester"] {
  return { id, email: `${id}@example.com`, name, avatarUrl: null };
}

function friendship(peerId: string, peerName: string | null): FriendshipDto {
  return {
    id: `f-${peerId}`,
    status: "accepted",
    shareScope: "aggregates",
    createdAt: "2026-01-01T00:00:00.000Z",
    respondedAt: "2026-01-02T00:00:00.000Z",
    requester: friendUser("viewer", "Me"),
    addressee: friendUser(peerId, peerName),
    direction: "friend",
  };
}

describe("resolveAcceptedFriendName", () => {
  it("returns the accepted peer display name for a 403 interpolation", () => {
    const name = resolveAcceptedFriendName(
      [friendship("friend-1", "Alex")],
      "viewer",
      "friend-1",
      "Friend"
    );
    expect(name).toBe("Alex");
  });

  it("returns the fallback when the UUID is not in the friends list (404 path)", () => {
    const name = resolveAcceptedFriendName(
      [friendship("friend-1", "Alex")],
      "viewer",
      "random-uuid",
      "Friend"
    );
    expect(name).toBe("Friend");
  });
});
