import { NextRequest, NextResponse } from "next/server";
import { getArtistStats, getArtistOverview } from "@/lib/services/artist/artist-service";
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
    
    // Extraire le paramètre limit
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Valider le limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Le paramètre limit doit être entre 1 et 100" },
        { status: 400 }
      );
    }

    const [overview, topArtists] = await Promise.all([
      getArtistOverview(startDate, endDate, userId),
      getArtistStats(startDate, endDate, userId, limit)
    ]);

    const response: ArtistsResponseDto = {
      overview,
      topArtists
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: '/api/artists' });
  }
}