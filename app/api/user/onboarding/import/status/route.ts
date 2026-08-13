import { NextRequest, NextResponse } from "next/server";
import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import { getUserImportCursor } from "@/lib/services/listening/get-user-import-cursor";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRecentAuthenticatedUser(request);
    if (!auth.ok) return auth.response;

    const [spotify, apple] = await Promise.all([
      getUserImportCursor(auth.userId, "spotify"),
      getUserImportCursor(auth.userId, "apple"),
    ]);

    return NextResponse.json({
      ok: true,
      spotify: {
        listenCount: spotify.listenCount,
        lastPlayedAt: spotify.lastPlayedAt?.toISOString() ?? null,
        lastTrackLabel: spotify.lastTrackLabel,
        hasData: spotify.listenCount > 0,
        sources: spotify.sources,
      },
      apple: {
        listenCount: apple.listenCount,
        lastPlayedAt: apple.lastPlayedAt?.toISOString() ?? null,
        lastTrackLabel: apple.lastTrackLabel,
        hasData: apple.listenCount > 0,
        sources: apple.sources,
      },
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/user/onboarding/import/status" });
  }
}
