import { NextRequest, NextResponse } from "next/server";
import { countArtistsForRange, getArtistStats, getArtistOverview } from "@/lib/services/artist/artist-service";
import { ArtistsResponseDto } from "@/lib/dto/artist";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
} from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { isActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import { getPublicProfileArtistsListCached } from "@/lib/services/artist/public-artists-list-cached";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/artists:
 *   get:
 *     summary: Gets artist statistics
 *     description: Returns detailed stats for the most listened artists with overview
 *     tags:
 *       - Artists
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of artists to return
 *     responses:
 *       200:
 *         description: Artist statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistsResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const { startDate, endDate } = extractOptionalDateRange(request);
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;

    const isPublicDemoDataset = await isActivePublicProfileUserId(userId);
    
    // Extraire le paramètre limit
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Valider le limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Le paramètre limit doit être entre 1 et 100" },
        { status: 400 }
      );
    }
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: "Le paramètre offset doit être supérieur ou égal à 0" },
        { status: 400 }
      );
    }

    let response: ArtistsResponseDto;
    if (isPublicDemoDataset) {
      response = await getPublicProfileArtistsListCached(
        userId,
        startDate,
        endDate,
        limit,
        offset
      );
    } else {
      const [overview, total, topArtists] = await Promise.all([
        getArtistOverview(startDate, endDate, userId),
        countArtistsForRange(startDate, endDate, userId),
        getArtistStats(startDate, endDate, userId, limit, offset),
      ]);
      response = {
        overview,
        topArtists,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + topArtists.length < total,
        },
      };
    }

    return publicDemoJsonResponse(response, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: '/api/artists' });
  }
}