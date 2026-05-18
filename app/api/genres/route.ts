import { NextRequest } from "next/server";
import {
  getGenreDistribution,
  getTopArtistsForGenres,
} from "@/lib/services/listening/listening-stats";
import { GenreDistributionResponse } from "@/lib/dto/genres";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractOptionalDateRange,
} from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import { getPublicProfileGenresDistributionCached } from "@/lib/services/listening/public-genres-distribution-cached";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Gets music genre distribution
 *     description: Returns listen distribution by genre with counts and percentages
 *     tags:
 *       - Genres
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
 *         description: Genre distribution
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GenreDistribution'
 *                 totalListens:
 *                   type: integer
 *                   description: Total number of listens
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

    const publicProfileId = getPublicProfileUserId();
    const isPublicDemoDataset =
      publicProfileId !== null && userId === publicProfileId;

    const response: GenreDistributionResponse = isPublicDemoDataset
      ? await getPublicProfileGenresDistributionCached(userId, startDate, endDate)
      : await (async () => {
          const genreCounts = await getGenreDistribution(
            startDate,
            endDate,
            userId
          );
          const totalListens = genreCounts.reduce((sum, item) => sum + item.count, 0);
          const data = genreCounts.map((item) => ({
            genre: item.genre,
            count: item.count,
            percentage: totalListens > 0 ? (item.count / totalListens) * 100 : 0,
          }));
          const topGenreNames = genreCounts.slice(0, 3).map((g) => g.genre);
          const topArtistsForTopGenres =
            topGenreNames.length > 0
              ? await getTopArtistsForGenres(
                  topGenreNames,
                  startDate,
                  endDate,
                  userId,
                  3
                )
              : [];
          return { data, totalListens, topArtistsForTopGenres };
        })();

    return publicDemoJsonResponse(response, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: '/api/genres' });
  }
}


