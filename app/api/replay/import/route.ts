import { NextRequest, NextResponse } from "next/server";
import { importReplayYearly } from "@/lib/services/replay/replay-service";
import { handleApiError, createValidationError, AppError } from "@/lib/utils/error-handler";
import { resolveImportUserId } from "@/lib/auth/resolve-import-user-id";
import {
  applyRateLimitHeaders,
  assertRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const REPLAY_IMPORT_RATE_LIMIT = {
  route: "/api/replay/import",
  windowMs: 60_000,
  maxRequests: 5,
} as const;

/**
 * POST /api/replay/import
 * 
 * Import a yearly Apple Music Replay summary
 * 
 * Request body:
 * {
 *   userId: string (required)
 *   data: ReplayYearlyInput (required)
 * }
 */
export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let rateLimit: RateLimitResult | undefined;
  try {
    const body = await request.json();
    const resolved = await resolveImportUserId(request, body?.userId);
    if (!resolved.ok) return resolved.response;
    userId = resolved.userId;
    rateLimit = await assertRateLimit(request, {
      ...REPLAY_IMPORT_RATE_LIMIT,
      userId,
    });

    if (!body.data) {
      throw createValidationError(
        "data is required",
        { body }
      );
    }

    // Import the Replay data
    const result = await importReplayYearly(userId, body.data);

    if (!result.success) {
      throw new AppError(
        400,
        "Failed to import Replay data",
        "VALIDATION_ERROR",
        {
          validationErrors: result.validationErrors,
          errors: result.errors,
        }
      );
    }

    const response = NextResponse.json({
      message: "Replay data imported successfully",
      replayYearlyId: result.replayYearlyId,
    });
    return applyRateLimitHeaders(response, rateLimit, REPLAY_IMPORT_RATE_LIMIT);
  } catch (error) {
    const response = handleApiError(error, { route: '/api/replay/import', userId });
    if (rateLimit) {
      return applyRateLimitHeaders(response, rateLimit, REPLAY_IMPORT_RATE_LIMIT);
    }
    return response;
  }
}

