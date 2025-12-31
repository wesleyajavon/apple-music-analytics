import { NextRequest, NextResponse } from "next/server";
import { importLastFmTracks, isLastFmConfigured } from "@/lib/services/lastfm";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";

// Force dynamic rendering
export const dynamic = "force-dynamic";

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
 * }
 */
export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const body = await request.json();
    userId = body?.userId;

    // Validate request body
    if (!body.userId || typeof body.userId !== "string") {
      throw createValidationError(
        "userId is required and must be a string",
        { body }
      );
    }

    const { userId: validatedUserId, username, limit, page, from, to } = body;
    userId = validatedUserId;

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

    // Import tracks
    const result = await importLastFmTracks(validatedUserId, {
      username,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      from: from ? parseInt(String(from), 10) : undefined,
      to: to ? parseInt(String(to), 10) : undefined,
    });

    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      _meta: {
        mocked: isMocked,
        message: isMocked
          ? "Using mocked Last.fm data. Configure LASTFM_API_KEY and LASTFM_API_SECRET for real data."
          : "Using real Last.fm API",
      },
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/lastfm/import', userId });
  }
}

