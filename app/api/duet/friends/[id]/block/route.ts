import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { blockUser } from "@/lib/services/duet/friendship-service";
import { prisma } from "@/lib/prisma";
import {
  DUET_RATE_LIMITS,
  logDuetSecurityEvent,
  mapDuetServiceError,
  serializeFriendship,
} from "@/lib/services/duet/duet-api";
import { DuetServiceError } from "@/lib/services/duet/duet-errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsMutate;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: friendshipId } = await context.params;
  const route = `/api/duet/friends/${friendshipId}/block`;

  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, route, userId });

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      select: { requesterId: true, addresseeId: true },
    });
    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found", code: "FRIENDSHIP_NOT_FOUND" },
        { status: 404 }
      );
    }
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const targetUserId =
      friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId;

    try {
      const blocked = await blockUser(userId, targetUserId);
      logDuetSecurityEvent({
        action: "block",
        route,
        actorUserId: userId,
        friendshipId,
        targetUserId,
        request,
      });
      return NextResponse.json({ friendship: serializeFriendship(blocked) });
    } catch (error) {
      if (error instanceof DuetServiceError) {
        return mapDuetServiceError(error);
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error, { route });
  }
}
