import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  enqueueGroqImportGenreBackfillJob,
  getGroqImportGenreBackfillEligibility,
  triggerImportGenreBackfillWorker,
} from "@/lib/services/listening/import-genre-backfill-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ROUTE = "/api/user/onboarding/import/genre-backfill/start";

const RATE = {
  route: ROUTE,
  windowMs: 60_000,
  maxRequests: 10,
  softLimitRatio: 0.8,
} as const;

/**
 * User must explicitly consent before any Groq calls for post-import genre backfill.
 */
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

    const eligibility = await getGroqImportGenreBackfillEligibility(userId);
    if (eligibility.unknownTrackCount === 0 || eligibility.totalTrackCount === 0) {
      return NextResponse.json(
        { ok: false, error: "No tracks without genre to classify." },
        { status: 400 }
      );
    }

    const queued = await enqueueGroqImportGenreBackfillJob(userId);
    void triggerImportGenreBackfillWorker();

    return NextResponse.json({
      ok: true,
      jobId: queued.jobId,
      status: queued.status,
      reused: queued.reused,
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
