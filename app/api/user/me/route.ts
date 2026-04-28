import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/me";

const PATCH_RATE = {
  route: ROUTE,
  windowMs: 60_000,
  maxRequests: 30,
} as const;

const PatchMeBodySchema = z.object({
  name: z
    .string()
    .max(200)
    .transform((s) => {
      const t = s.trim();
      return t.length === 0 ? null : t;
    }),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    return NextResponse.json({
      user: { name: user?.name ?? null, email: user?.email ?? null },
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const rl = await assertRateLimit(request, { ...PATCH_RATE, userId });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = PatchMeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          code: "VALIDATION_ERROR",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const displayName = parsed.data.name;
    const metadataName = displayName ?? "";

    const supabase = await createSupabaseServerClient();
    const { error: authError } = await supabase.auth.updateUser({
      data: { name: metadataName, full_name: metadataName },
    });
    if (authError) {
      logger.warn(
        { err: authError, route: ROUTE },
        "Supabase auth.updateUser failed when updating display name"
      );
      return NextResponse.json(
        { error: authError.message, code: "AUTH_UPDATE_FAILED" },
        { status: 502 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: displayName },
      select: { name: true, email: true },
    });

    return NextResponse.json({
      user: { name: updated.name, email: updated.email },
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
