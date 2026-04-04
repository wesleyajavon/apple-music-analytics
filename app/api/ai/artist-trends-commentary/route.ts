import { NextRequest, NextResponse } from "next/server";
import {
  getArtistTrendsChartRowsForArtistIds,
} from "@/lib/services/artist/artist-service";
import { prisma } from "@/lib/prisma";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type { ArtistTrendsCommentaryApiResponse } from "@/lib/dto/artist-trends-ai";
import type { ArtistTrendsChartArtist } from "@/lib/dto/artist";
import { AppError, handleApiError } from "@/lib/utils/error-handler";
import { assertGroqUserQuotaForRequest } from "@/lib/services/ai/groq-user-quota";
import { isAiMasterEnabledForRequest } from "@/lib/services/ai/ai-master";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale, type AiLocale } from "@/lib/services/ai/locale-utils";
import { pivotArtistTrends } from "@/lib/utils/artist-trends-pivot";
import type { GenreTrendPeriod } from "@/lib/services/listening/listening-stats";
import {
  buildArtistTrendsCompactPayload,
  generateArtistTrendsCommentary,
} from "@/lib/services/ai/artist-trends-commentary";
import {
  getCachedArtistTrendsCommentary,
  setCachedArtistTrendsCommentary,
} from "@/lib/services/ai/artist-trends-commentary-cache";

export const dynamic = "force-dynamic";

const MAX_ARTIST_IDS = 50;

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function extractArtistIds(request: NextRequest): string[] {
  const values = new URL(request.url).searchParams.getAll("artists").filter(Boolean);
  return [...new Set(values)].sort().slice(0, MAX_ARTIST_IDS);
}

function extractCommentaryMode(request: NextRequest): "both" | "technical" | "light" {
  const raw = request.nextUrl.searchParams.get("mode");
  if (raw === "technical" || raw === "light") return raw;
  return "both";
}

async function resolveEnsureArtistsFromIds(
  orderedIds: string[]
): Promise<ArtistTrendsChartArtist[]> {
  const rows = await prisma.artist.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r.name]));
  return orderedIds.map((id) => ({
    id,
    name: byId.get(id) ?? "Unknown",
  }));
}

export async function GET(request: NextRequest) {
  try {
    const artistIds = extractArtistIds(request);
    if (artistIds.length === 0) {
      return NextResponse.json(
        {
          error: "At least one `artists` query parameter is required.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");

    let startDate: Date;
    let endDate: Date;
    let timeFilterMode: "all_time" | "custom_range";

    if (!hasStartDate && !hasEndDate) {
      const userId = extractOptionalUserId(request);
      const range = await getListenDateRange(userId);
      if (!range) {
        const empty: ArtistTrendsCommentaryApiResponse = {
          commentary: null,
          commentaryLight: null,
        };
        return NextResponse.json(empty);
      }
      startDate = range.minDate;
      endDate = range.maxDate;
      timeFilterMode = "all_time";
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate);
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const extracted = extractDateRangeWithDefaults(
        request,
        defaultStartDate,
        defaultEndDate
      );
      startDate = extracted.startDate;
      endDate = extracted.endDate;
      timeFilterMode = "custom_range";
    }

    const period = extractPeriod(request, "month") as GenreTrendPeriod;
    const userId = extractOptionalUserId(request);
    const locale = parseAiLocale(extractOptionalString(request, "locale")) as AiLocale;
    const commentaryMode = extractCommentaryMode(request);

    const rows = await getArtistTrendsChartRowsForArtistIds(
      startDate,
      endDate,
      period,
      userId,
      artistIds
    );
    const ensureArtists = await resolveEnsureArtistsFromIds(artistIds);
    const { data: chartData } = pivotArtistTrends(
      rows,
      period,
      locale,
      undefined,
      ensureArtists
    );

    const idToName = new Map<string, string>(
      ensureArtists.map((a) => [a.id, a.name])
    );

    const payload = buildArtistTrendsCompactPayload(
      chartData,
      artistIds,
      idToName,
      period,
      { start: toIsoDate(startDate), end: toIsoDate(endDate) },
      timeFilterMode
    );

    if (!payload) {
      const empty: ArtistTrendsCommentaryApiResponse = {
        commentary: null,
        commentaryLight: null,
      };
      return NextResponse.json(empty);
    }

    if (!isAiMasterEnabledForRequest(request)) {
      const res: ArtistTrendsCommentaryApiResponse = {
        commentary: null,
        commentaryLight: null,
        aiUnavailable: true,
      };
      return NextResponse.json(res);
    }

    if (!process.env.GROQ_API_KEY) {
      const res: ArtistTrendsCommentaryApiResponse = {
        commentary: null,
        commentaryLight: null,
        aiUnavailable: true,
      };
      return NextResponse.json(res);
    }

    let commentary: string | null = null;
    let commentaryLight: string | null = null;
    let commentaryCached = false;
    let commentaryLightCached = false;

    const wantTech = commentaryMode === "both" || commentaryMode === "technical";
    const wantLight = commentaryMode === "both" || commentaryMode === "light";

    if (wantTech) {
      const cachedTech = await getCachedArtistTrendsCommentary(payload, locale, false);
      if (cachedTech) {
        commentary = cachedTech;
        commentaryCached = true;
      } else {
        try {
          await assertGroqUserQuotaForRequest(request);
          commentary = await generateArtistTrendsCommentary(payload, locale, false);
          if (commentary) {
            await setCachedArtistTrendsCommentary(payload, commentary, locale, false);
          }
        } catch (err) {
          if (err instanceof AppError && err.statusCode === 429) throw err;
          console.warn("Artist trends AI commentary (technical) failed:", err);
        }
      }
    }

    if (wantLight) {
      const cachedLight = await getCachedArtistTrendsCommentary(payload, locale, true);
      if (cachedLight) {
        commentaryLight = cachedLight;
        commentaryLightCached = true;
      } else {
        try {
          await assertGroqUserQuotaForRequest(request);
          commentaryLight = await generateArtistTrendsCommentary(payload, locale, true);
          if (commentaryLight) {
            await setCachedArtistTrendsCommentary(payload, commentaryLight, locale, true);
          }
        } catch (err) {
          if (err instanceof AppError && err.statusCode === 429) throw err;
          console.warn("Artist trends AI commentary (light) failed:", err);
        }
      }
    }

    const response: ArtistTrendsCommentaryApiResponse = {
      commentary,
      commentaryLight,
      commentaryCached: commentary ? commentaryCached : undefined,
      commentaryLightCached: commentaryLight ? commentaryLightCached : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/ai/artist-trends-commentary" });
  }
}
