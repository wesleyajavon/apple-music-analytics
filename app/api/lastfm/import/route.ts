import { NextRequest, NextResponse } from "next/server";
import { importLastFmTracks, isLastFmConfigured } from "@/lib/services/lastfm";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * POST /api/lastfm/import
 * 
 * Import Last.fm tracks into the database
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
  try {
    const body = await request.json();

    // Validate request body
    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        { error: "userId is required and must be a string" },
        { status: 400 }
      );
    }

    const { userId, username, limit, page, from, to } = body;

    // Validate limit if provided
    if (limit !== undefined) {
      const limitNum = parseInt(String(limit), 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
        return NextResponse.json(
          { error: "limit must be a number between 1 and 200" },
          { status: 400 }
        );
      }
    }

    // Validate page if provided
    if (page !== undefined) {
      const pageNum = parseInt(String(page), 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json(
          { error: "page must be a number greater than 0" },
          { status: 400 }
        );
      }
    }

    // Check if Last.fm is configured (warn if using mocked data)
    const isMocked = !isLastFmConfigured();

    // Import tracks
    const result = await importLastFmTracks(userId, {
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
    console.error("Error importing Last.fm tracks:", error);
    return NextResponse.json(
      {
        error: "Failed to import Last.fm tracks",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

