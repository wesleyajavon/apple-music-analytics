import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import {
  assertFriendDataAccess,
  type FriendDataAccessRequiredScope,
} from "@/lib/services/duet/assert-friend-data-access";

export const DUET_COMPARE_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

const FriendUserIdSchema = z.string().uuid();

export type DuetCompareAccess =
  | { ok: true; viewerId: string; friendUserId: string }
  | { ok: false; response: NextResponse };

export function parseFriendUserId(request: NextRequest): string | null {
  const raw = request.nextUrl.searchParams.get("friendUserId");
  const parsed = FriendUserIdSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function invalidFriendUserIdResponse() {
  return NextResponse.json(
    { error: "Invalid friendUserId", code: "VALIDATION_ERROR" },
    { status: 400 }
  );
}

export function friendAccessDeniedResponse(status: 403 | 404) {
  if (status === 404) {
    return NextResponse.json(
      { error: "Not found", code: "NOT_FOUND" },
      { status: 404 }
    );
  }
  return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
}

export async function requireDuetCompareAccess(
  request: NextRequest,
  route: string,
  requiredScope: FriendDataAccessRequiredScope
): Promise<DuetCompareAccess> {
  const viewerId = await requireAuthenticatedUserId(request);
  if (!viewerId) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const friendUserId = parseFriendUserId(request);
  if (!friendUserId) {
    return { ok: false, response: invalidFriendUserIdResponse() };
  }

  const access = await assertFriendDataAccess({
    viewerId,
    targetUserId: friendUserId,
    requiredScope,
  });
  if (!access.ok) {
    return { ok: false, response: friendAccessDeniedResponse(access.status) };
  }

  await assertAnalyticsRateLimit(
    request,
    { ...DUET_COMPARE_RATE_LIMIT, route },
    viewerId
  );

  return { ok: true, viewerId, friendUserId };
}
