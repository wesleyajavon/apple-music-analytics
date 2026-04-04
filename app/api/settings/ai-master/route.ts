/**
 * GET : état IA pour le navigateur (`enabled`, `envLocked` si kill-switch env).
 * POST : `{ "enabled": boolean }` — active/désactive l’IA via cookie (si l’env le permet).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AI_MASTER_DISABLED_COOKIE,
  isAiMasterEnvEnabled,
} from "@/lib/services/ai/ai-master";

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
    return json({ enabled: false, envLocked: true });
  }
  const disabledByCookie =
    request.cookies.get(AI_MASTER_DISABLED_COOKIE)?.value === "1";
  return json({
    enabled: !disabledByCookie,
    envLocked: false,
  });
}

export async function POST(request: NextRequest) {
  const envLocked = !isAiMasterEnvEnabled();
  if (envLocked) {
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
  const res = json({ success: true, enabled, envLocked: false });

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
