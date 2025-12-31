import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/services/listening";
import { OverviewStatsDto } from "@/lib/dto/listening";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";

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
    const { searchParams } = new URL(request.url);

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const userId = searchParams.get("userId") || undefined;

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      throw createValidationError(
        "Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)",
        { startDate: startDateParam }
      );
    }

    if (endDate && isNaN(endDate.getTime())) {
      throw createValidationError(
        "Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)",
        { endDate: endDateParam }
      );
    }

    const stats = await getOverviewStats(startDate, endDate, userId);

    const response: OverviewStatsDto = stats;

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/overview' });
  }
}


