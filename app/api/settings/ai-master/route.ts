/**
 * GET : état IA pour le navigateur (`enabled`, `envLocked` si kill-switch env).
 * POST : `{ "enabled": boolean }` — active/désactive l’IA via cookie (si l’env le permet).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import {
  AI_MASTER_DISABLED_COOKIE,
  isAiMasterEnvEnabled,
} from "@/lib/services/ai/ai-master";
import { hasGroqGenreConsent } from "@/lib/services/user/privacy-preferences";
import { logSecurityAuthEvent } from "@/lib/security/security-logger";

export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const PostBodySchema = z.object({
  enabled: z.boolean(),
});

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function GET(request: NextRequest) {
  const envLocked = !isAiMasterEnvEnabled();
  if (envLocked) {
    return json({ enabled: false, envLocked: true, consentRequired: false });
  }

  const userId = await getCurrentUserId(request);
  const consentGranted = userId ? await hasGroqGenreConsent(userId) : true;
  const disabledByCookie =
    request.cookies.get(AI_MASTER_DISABLED_COOKIE)?.value === "1";

  return json({
    enabled: consentGranted && !disabledByCookie,
    envLocked: false,
    consentRequired: userId ? !consentGranted : false,
  });
}

export async function POST(request: NextRequest) {
  const envLocked = !isAiMasterEnvEnabled();
  if (envLocked) {
    logSecurityAuthEvent({
      route: request.nextUrl.pathname,
      statusCode: 403,
      reason: "forbidden",
      request,
    });
    return json(
      {
        success: false,
        enabled: false,
        envLocked: true,
        error: "AI is disabled by server configuration (AI_MASTER_ENABLED=false).",
      },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { enabled } = parsed.data;
  const userId = await getCurrentUserId(request);
  if (enabled && userId && !(await hasGroqGenreConsent(userId))) {
    return json(
      {
        success: false,
        enabled: false,
        envLocked: false,
        consentRequired: true,
        error: "Enable Groq AI in Settings → Preferences before turning AI on.",
      },
      { status: 403 }
    );
  }

  const consentGranted = userId ? await hasGroqGenreConsent(userId) : true;
  const res = json({
    success: true,
    enabled: enabled && consentGranted,
    envLocked: false,
    consentRequired: userId ? !consentGranted : false,
  });

  if (enabled) {
    res.cookies.set(AI_MASTER_DISABLED_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      httpOnly: true,
    });
  } else {
    res.cookies.set(AI_MASTER_DISABLED_COOKIE, "1", {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  return res;
}
