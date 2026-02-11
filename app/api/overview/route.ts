import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats, getTopArtists } from "@/lib/services/listening/listening-stats";
import { OverviewStatsDto, TopArtistDto } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/overview:
 *   get:
 *     summary: Gets overview statistics
 *     description: Returns global listening stats (total listens, unique artists, unique tracks, total time)
 *     tags:
 *       - Overview
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in ISO 8601 format (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in ISO 8601 format (optional)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *     responses:
 *       200:
 *         description: Overview statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverviewStats'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: NextRequest) {
  try {
    const { startDate, endDate } = extractOptionalDateRange(request);
    const userId = extractOptionalUserId(request);

    const [stats, topArtists] = await Promise.all([
      getOverviewStats(startDate, endDate, userId),
      getTopArtists(startDate, endDate, userId, 6)
    ]);

    const response: OverviewStatsDto & { topArtists: TopArtistDto[] } = {
      ...stats,
      topArtists
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/overview' });
  }
}


