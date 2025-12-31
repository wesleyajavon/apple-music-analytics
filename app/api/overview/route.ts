import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/services/listening";
import { OverviewStatsDto } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * GET /api/overview
 * 
 * Route API pour récupérer les statistiques d'overview
 * 
 * Query parameters:
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - userId: User ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { startDate, endDate } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);

    const stats = await getOverviewStats(startDate, endDate, userId);

    const response: OverviewStatsDto = stats;

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/overview' });
  }
}


