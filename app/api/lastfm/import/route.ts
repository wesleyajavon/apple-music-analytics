import { NextRequest, NextResponse } from "next/server";
import { importLastFmTracks, isLastFmConfigured } from "@/lib/services/lastfm";
import { schedulePostImportSpotifyArtistImageEnrichment } from "@/lib/services/spotify/artist-image-enrichment";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";
import { resolveImportUserId } from "@/lib/auth/resolve-import-user-id";
import {
  applyRateLimitHeaders,
  assertRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const LASTFM_IMPORT_RATE_LIMIT = {
  route: "/api/lastfm/import",
  windowMs: 60_000,
  maxRequests: 5,
} as const;

/**
 * POST /api/lastfm/import
 * 
 * Import Last.fm tracks into the database
 * 
 * ⚠️  IMPORTANT: This endpoint makes direct calls to Last.fm API.
 * Please respect Last.fm's API usage guidelines:
 * - Don't make excessive calls (avoid calling on every page load)
 * - Don't make several calls per second
 * - Use this endpoint for manual imports or admin operations, not for regular user interactions
 * - The import script includes rate limiting (2 seconds between pages)
 * 
 * Request body:
 * {
 *   userId: string (required)
 *   username?: string - Last.fm username (optional)
 *   limit?: number - Number of tracks per page (default: 50, max: 200)
 *   page?: number - Page number (default: 1)
 *   from?: number - Unix timestamp start date (optional)
 *   to?: number - Unix timestamp end date (optional)
 *   dryRun?: boolean - If true, fetches and counts without writing to DB (optional)
 * }
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let rateLimit: RateLimitResult | undefined;
  try {
    const body = await request.json();
    const { username, limit, page, from, to, dryRun } = body ?? {};
    const resolved = await resolveImportUserId(request, body?.userId);
    if (!resolved.ok) return resolved.response;
    userId = resolved.userId;
    rateLimit = await assertRateLimit(request, {
      ...LASTFM_IMPORT_RATE_LIMIT,
      userId,
    });

    // Validate limit if provided
    if (limit !== undefined) {
      const limitNum = parseInt(String(limit), 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
        throw createValidationError(
          "limit must be a number between 1 and 200",
          { limit }
        );
      }
    }

    // Validate page if provided
    if (page !== undefined) {
      const pageNum = parseInt(String(page), 10);
      if (isNaN(pageNum) || pageNum < 1) {
        throw createValidationError(
          "page must be a number greater than 0",
          { page }
        );
      }
    }

    // Check if Last.fm is configured (warn if using mocked data)
    const isMocked = !isLastFmConfigured();

    // Import tracks (or dry-run)
    const result = await importLastFmTracks(userId, {
      username,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      from: from ? parseInt(String(from), 10) : undefined,
      to: to ? parseInt(String(to), 10) : undefined,
      dryRun: dryRun === true,
    });

    if (!result.dryRun && result.imported > 0) {
      schedulePostImportSpotifyArtistImageEnrichment({ userId });
    }

    const response = NextResponse.json({
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      dryRun: result.dryRun,
      _meta: {
        mocked: isMocked,
        message: isMocked
          ? "Using mocked Last.fm data. Configure LASTFM_API_KEY and LASTFM_API_SECRET for real data."
          : "Using real Last.fm API",
      },
    });
    return applyRateLimitHeaders(response, rateLimit, LASTFM_IMPORT_RATE_LIMIT);
  } catch (error) {
    const response = handleApiError(error, { route: '/api/lastfm/import', userId });
    if (rateLimit) {
      return applyRateLimitHeaders(response, rateLimit, LASTFM_IMPORT_RATE_LIMIT);
    }
    return response;
  }
}

