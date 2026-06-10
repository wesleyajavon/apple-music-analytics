import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { listFriendships } from "@/lib/services/duet/friendship-service";
import { DUET_RATE_LIMITS, serializeFriendship } from "@/lib/services/duet/duet-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = DUET_RATE_LIMITS.friendsList;

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    const result = await listFriendships(userId);
    return NextResponse.json({
      friends: result.friends.map(serializeFriendship),
      pendingIncoming: result.pendingIncoming.map(serializeFriendship),
      pendingOutgoing: result.pendingOutgoing.map(serializeFriendship),
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
