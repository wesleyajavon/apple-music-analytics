import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  getActiveGroqBackfillJobForDashboard,
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

    const includeTerminal = request.nextUrl.searchParams.get("includeTerminal") === "1";
    const includeEligibility = request.nextUrl.searchParams.get("includeEligibility") === "1";

    const job = includeTerminal
      ? await getGroqBackfillJobForDashboard(userId)
      : await getActiveGroqBackfillJobForDashboard(userId);
    const eligibility = includeEligibility
      ? await getGroqImportGenreBackfillEligibility(userId)
      : null;

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
