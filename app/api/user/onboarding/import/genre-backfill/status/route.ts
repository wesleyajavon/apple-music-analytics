import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  getGroqBackfillJobForDashboard,
  getGroqImportGenreBackfillEligibility,
  triggerImportGenreBackfillWorkerRunOnce,
} from "@/lib/services/listening/import-genre-backfill-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ROUTE = "/api/user/onboarding/import/genre-backfill/status";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    const [job, eligibility] = await Promise.all([
      getGroqBackfillJobForDashboard(userId),
      getGroqImportGenreBackfillEligibility(userId),
    ]);

    // Ne lancer le worker que lorsqu’un job actif existe (évite run-once + requêtes file à chaque poll à vide).
    if (
      job &&
      (job.status === "pending" ||
        job.status === "running" ||
        job.status === "paused")
    ) {
      void triggerImportGenreBackfillWorkerRunOnce({ userId });
    }

    return NextResponse.json({
      ok: true,
      job,
      eligibility,
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
