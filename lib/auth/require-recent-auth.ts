import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureAppUserFromSession } from "@/lib/auth/ensure-app-user-from-session";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import {
  DEFAULT_RECENT_AUTH_MAX_AGE_MS,
  RECENT_AUTH_REQUIRED_CODE,
  getRecentAuthMaxAgeMinutes,
} from "@/lib/auth/recent-auth-constants";
import { logSecurityAuthEvent } from "@/lib/security/security-logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RecentAuthResult =
  | {
      ok: true;
      userId: string;
      authenticatedAt: Date;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function getAuthenticatedAt(user: User): Date | null {
  const raw = user.last_sign_in_at ?? user.created_at;
  if (!raw) return null;

  const authenticatedAt = new Date(raw);
  if (Number.isNaN(authenticatedAt.getTime())) return null;
  return authenticatedAt;
}

export function recentAuthRequiredResponse(maxAgeMs = DEFAULT_RECENT_AUTH_MAX_AGE_MS) {
  return NextResponse.json(
    {
      error: "Please sign in again before continuing.",
      code: RECENT_AUTH_REQUIRED_CODE,
      maxAgeMinutes: getRecentAuthMaxAgeMinutes(maxAgeMs),
    },
    { status: 403 }
  );
}

export async function requireRecentAuthenticatedUser(
  request: NextRequest,
  options?: { maxAgeMs?: number }
): Promise<RecentAuthResult> {
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_RECENT_AUTH_MAX_AGE_MS;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      logSecurityAuthEvent({
        route: request.nextUrl.pathname,
        statusCode: 401,
        reason: "unauthorized",
        userId: null,
        request,
      });
      return { ok: false, response: unauthorizedResponse() };
    }

    await ensureAppUserFromSession(user);

    const authenticatedAt = getAuthenticatedAt(user);
    const isFresh =
      authenticatedAt != null && Date.now() - authenticatedAt.getTime() <= maxAgeMs;

    if (!isFresh) {
      logSecurityAuthEvent({
        route: request.nextUrl.pathname,
        statusCode: 403,
        reason: "forbidden",
        userId: user.id,
        request,
      });
      return { ok: false, response: recentAuthRequiredResponse(maxAgeMs) };
    }

    return { ok: true, userId: user.id, authenticatedAt };
  } catch {
    logSecurityAuthEvent({
      route: request.nextUrl.pathname,
      statusCode: 401,
      reason: "unauthorized",
      userId: null,
      request,
    });
    return { ok: false, response: unauthorizedResponse() };
  }
}
