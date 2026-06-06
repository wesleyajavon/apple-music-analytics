import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { logger } from "@/lib/utils/logger";
import { prisma } from "@/lib/prisma";
import { deleteUserAccount } from "@/lib/services/user/delete-user-account";
import {
  buildExpectedDeletionPhrase,
  deletionPhrasesMatch,
} from "@/lib/user/deletion-confirmation-phrase";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/delete-account";

const RATE = {
  route: ROUTE,
  windowMs: 3_600_000,
  maxRequests: 3,
  softLimitRatio: 0.8,
} as const;

const DeleteBodySchema = z.object({
  confirm: z.literal(true),
  phrase: z.string().min(1),
});

async function loadConfirmationPhrase(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return buildExpectedDeletionPhrase(user?.name, user?.email);
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRecentAuthenticatedUser(request);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    await assertRateLimit(request, { ...RATE, userId });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = DeleteBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "confirm must be true and phrase must be a non-empty string",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const expected = await loadConfirmationPhrase(userId);
    if (!expected) {
      return NextResponse.json(
        {
          error: "No confirmation phrase could be derived from your profile",
          code: "NO_CONFIRMATION_PHRASE",
        },
        { status: 409 }
      );
    }

    if (!deletionPhrasesMatch(parsed.data.phrase, expected)) {
      return NextResponse.json(
        {
          error: "The phrase does not match your profile",
          code: "PHRASE_MISMATCH",
        },
        { status: 400 }
      );
    }

    await deleteUserAccount(userId);

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    logger.info("User account deleted", { route: ROUTE });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
