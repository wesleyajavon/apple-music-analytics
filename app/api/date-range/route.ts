/**
 * GET /api/date-range
 *
 * Returns the full date range of listens in the database (min and max playedAt).
 * Used when the "all" (tout) filter is selected to fetch AI insights and taste profile
 * with the complete listening history instead of falling back to 30 days.
 */

import { NextRequest, NextResponse } from "next/server";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import { handleApiError } from "@/lib/utils/error-handler";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    const range = await getListenDateRange(userId);

    if (!range) {
      return NextResponse.json({ startDate: null, endDate: null });
    }

    const startDate = range.minDate.toISOString().split("T")[0];
    const endDate = range.maxDate.toISOString().split("T")[0];

    return NextResponse.json({ startDate, endDate });
  } catch (error) {
    return handleApiError(error, { route: "/api/date-range" });
  }
}
