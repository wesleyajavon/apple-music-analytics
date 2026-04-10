import { NextRequest, NextResponse } from "next/server";
import { getOverviewStats, getTopArtists } from "@/lib/services/listening/listening-stats";
import { OverviewStatsDto, TopArtistDto } from "@/lib/dto/listening";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
} from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";
const OVERVIEW_RATE_LIMIT = {
  route: "/api/overview",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

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
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertRateLimit(request, {
      ...OVERVIEW_RATE_LIMIT,
      userId,
    });

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


