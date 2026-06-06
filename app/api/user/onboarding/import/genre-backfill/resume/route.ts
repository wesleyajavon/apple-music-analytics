import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { resumeGroqImportGenreBackfillForUser } from "@/lib/services/listening/import-genre-backfill-queue";
import { assertGroqGenreConsent } from "@/lib/services/user/privacy-preferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ROUTE = "/api/user/onboarding/import/genre-backfill/resume";

const RATE = {
  route: ROUTE,
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    if (!process.env.GROQ_API_KEY?.trim()) {
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY is not configured on the server." },
        { status: 503 }
      );
    }

    await assertGroqGenreConsent(userId);

    const result = await resumeGroqImportGenreBackfillForUser(userId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, jobId: result.jobId });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
