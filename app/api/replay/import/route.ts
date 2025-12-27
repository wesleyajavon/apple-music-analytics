import { NextResponse } from "next/server";
import { importReplayYearly } from "@/lib/services/replay";

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
  try {
    const body = await request.json();

    // Validate request body structure
    if (!body.userId || typeof body.userId !== "string") {
      return NextResponse.json(
        { error: "userId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.data) {
      return NextResponse.json(
        { error: "data is required" },
        { status: 400 }
      );
    }

    // Import the Replay data
    const result = await importReplayYearly(body.userId, body.data);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to import Replay data",
          validationErrors: result.validationErrors,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Replay data imported successfully",
      replayYearlyId: result.replayYearlyId,
    });
  } catch (error) {
    console.error("Error importing Replay data:", error);
    return NextResponse.json(
      {
        error: "Failed to import Replay data",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

