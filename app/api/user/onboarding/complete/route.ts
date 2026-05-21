import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { routing } from "@/i18n/routing";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const RATE = {
  route: "/api/user/onboarding/complete",
  windowMs: 60_000,
  maxRequests: 10,
  softLimitRatio: 0.8,
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });

    for (const locale of routing.locales) {
      revalidatePath(`/${locale}/dashboard`, "layout");
      revalidatePath(`/${locale}/dashboard/onboarding`, "page");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
