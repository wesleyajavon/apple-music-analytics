import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/error-handler";
import { triggerImportGenreBackfillWorkerRunOnce } from "@/lib/services/listening/import-genre-backfill-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ROUTE = "/api/internal/genre-backfill/run-once";

function isAuthorized(request: NextRequest): boolean {
  const userAgent = (request.headers.get("user-agent") ?? "").toLowerCase();
  if (userAgent.includes("vercel-cron/1.")) {
    return true;
  }

  const secret = process.env.INTERNAL_CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  return token.length > 0 && token === secret;
}

/**
 * Cron-safe entrypoint: process one small slice of one pending/running Groq backfill job.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await triggerImportGenreBackfillWorkerRunOnce();
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      jobId: result.jobId,
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
