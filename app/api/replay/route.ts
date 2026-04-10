import { NextRequest, NextResponse } from "next/server";
import { getReplayYearlySummaries } from "@/lib/services/replay/replay-service";
import { handleApiError } from "@/lib/utils/error-handler";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";

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
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;

    const summaries = await getReplayYearlySummaries(userId);

    return NextResponse.json(summaries);
  } catch (error) {
    return handleApiError(error, { route: '/api/replay' });
  }
}


