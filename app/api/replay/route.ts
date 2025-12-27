import { NextRequest, NextResponse } from "next/server";
import { getReplayYearlySummaries } from "@/lib/services/replay";

// Force dynamic rendering
export const dynamic = "force-dynamic";

/**
 * GET /api/replay
 * 
 * Récupère toutes les années Replay disponibles pour un utilisateur
 * 
 * Query parameters:
 * - userId: User ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "default_user"; // TODO: Get from auth

    const summaries = await getReplayYearlySummaries(userId);

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Error fetching Replay summaries:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Replay summaries",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

