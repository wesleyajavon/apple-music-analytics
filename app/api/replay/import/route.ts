import { NextResponse } from "next/server";
import { importReplayYearly } from "@/lib/services/replay/replay-service";
import { handleApiError, createValidationError, AppError } from "@/lib/utils/error-handler";

// Force dynamic rendering
export const dynamic = "force-dynamic";

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
export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const body = await request.json();
    userId = body?.userId;

    // Validate request body structure
    if (!body.userId || typeof body.userId !== "string") {
      throw createValidationError(
        "userId is required and must be a string",
        { body }
      );
    }

    if (!body.data) {
      throw createValidationError(
        "data is required",
        { body }
      );
    }

    // Import the Replay data
    const result = await importReplayYearly(body.userId, body.data);

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

    return NextResponse.json({
      message: "Replay data imported successfully",
      replayYearlyId: result.replayYearlyId,
    });
  } catch (error) {
    return handleApiError(error, { route: '/api/replay/import', userId });
  }
}

