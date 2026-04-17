import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  getLatestImportGenreBackfillJob,
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

    // Best-effort self-heal: serverless-safe single slice.
    void triggerImportGenreBackfillWorkerRunOnce();

    const job = await getLatestImportGenreBackfillJob(userId);
    return NextResponse.json({
      ok: true,
      job,
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
