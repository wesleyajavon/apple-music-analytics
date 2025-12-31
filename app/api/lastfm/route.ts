import { NextRequest, NextResponse } from "next/server";
import {
  getRecentTracks,
  getRecentTracksRaw,
  isLastFmConfigured,
} from "@/lib/services/lastfm";
import { handleApiError, createValidationError } from "@/lib/utils/error-handler";

// Force dynamic rendering since we use request.url
export const dynamic = "force-dynamic";

/**
 * GET /api/lastfm
 * 
 * Fetch recent tracks from Last.fm API (uses real API if configured, otherwise falls back to mock data)
 * 
 * ⚠️  IMPORTANT: This endpoint makes direct calls to Last.fm API.
 * Please respect Last.fm's API usage guidelines:
 * - Don't make excessive calls (avoid calling on every page load)
 * - Don't make several calls per second
 * - Use this endpoint for manual imports or admin operations, not for regular user interactions
 * 
 * Query parameters:
 * - username: Last.fm username (required for real data)
 * - limit: Number of tracks per page (default: 50, max: 200)
 * - page: Page number (default: 1)
 * - from: Unix timestamp - start date (optional)
 * - to: Unix timestamp - end date (optional)
 * - format: 'normalized' | 'raw' - Response format (default: 'normalized')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const username = searchParams.get("username") || undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      200
    );
    const page = parseInt(searchParams.get("page") || "1", 10);
    const from = searchParams.get("from")
      ? parseInt(searchParams.get("from")!, 10)
      : undefined;
    const to = searchParams.get("to")
      ? parseInt(searchParams.get("to")!, 10)
      : undefined;
    const format = searchParams.get("format") || "normalized";

    // Validate parameters
    if (limit < 1 || limit > 200) {
      throw createValidationError(
        "Limit must be between 1 and 200",
        { limit }
      );
    }

    if (page < 1) {
      throw createValidationError(
        "Page must be greater than 0",
        { page }
      );
    }

    // Check if using mocked data
    const isMocked = !isLastFmConfigured();

    // Fetch recent tracks
    if (format === "raw") {
      const rawData = await getRecentTracksRaw({
        username,
        limit,
        page,
        from,
        to,
      });

      return NextResponse.json({
        ...rawData,
        _meta: {
          mocked: isMocked,
          message: isMocked
            ? "Using mocked Last.fm data. Configure LASTFM_API_KEY and LASTFM_API_SECRET for real data."
            : "Using real Last.fm API",
        },
      });
    } else {
      const normalizedData = await getRecentTracks({
        username,
        limit,
        page,
        from,
        to,
      });

      return NextResponse.json({
        ...normalizedData,
        _meta: {
          mocked: isMocked,
          message: isMocked
            ? "Using mocked Last.fm data. Configure LASTFM_API_KEY and LASTFM_API_SECRET for real data."
            : "Using real Last.fm API",
        },
      });
    }
  } catch (error) {
    return handleApiError(error, { route: '/api/lastfm' });
  }
}

