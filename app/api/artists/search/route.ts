import { NextRequest, NextResponse } from "next/server";
import { ARTIST_SEARCH_MAX_RESULTS, searchArtistsByName } from "@/lib/services/artist/artist-service";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw
      ? Math.min(Math.max(parseInt(limitRaw, 10) || 1, 1), ARTIST_SEARCH_MAX_RESULTS)
      : ARTIST_SEARCH_MAX_RESULTS;

    if (q.length < 2) {
      return NextResponse.json({ artists: [] });
    }
    if (q.length > 200) {
      return NextResponse.json(
        { error: "Query too long", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const artists = await searchArtistsByName(q, limit);
    return NextResponse.json({ artists });
  } catch (error) {
    return handleApiError(error, { route: "/api/artists/search" });
  }
}
