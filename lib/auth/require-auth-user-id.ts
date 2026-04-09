import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { logSecurityAuthEvent } from "@/lib/security/security-logger";

export async function requireAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const userId = (await getCurrentUserId(request)) ?? null;
  if (!userId) {
    logSecurityAuthEvent({
      route: request.nextUrl.pathname,
      statusCode: 401,
      reason: "unauthorized",
      userId,
      request,
    });
  }
  return userId;
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401 }
  );
}
