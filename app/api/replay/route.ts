import { NextRequest, NextResponse } from "next/server";
import { getReplayYearlySummaries } from "@/lib/services/replay/replay-service";
import { handleApiError } from "@/lib/utils/error-handler";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/replay
 * 
 * Récupère toutes les années Replay disponibles pour un utilisateur
 * 
 * Query parameters:
 * - userId: User ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const summaries = await getReplayYearlySummaries(userId);

    return NextResponse.json(summaries);
  } catch (error) {
    return handleApiError(error, { route: '/api/replay' });
  }
}


