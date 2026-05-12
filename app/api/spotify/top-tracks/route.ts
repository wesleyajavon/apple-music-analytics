import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getValidSpotifyAccessTokenForUser } from "@/lib/services/spotify/get-valid-access-token";
import {
  parseSpotifyApiErrorMessage,
  spotifyFetchJson,
} from "@/lib/services/spotify/spotify-http";
import {
  AppError,
  createValidationError,
  ErrorCodes,
  handleApiError,
} from "@/lib/utils/error-handler";
import { validateOptionalInteger } from "@/lib/validators/api-validators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const RATE = {
  route: "/api/spotify/top-tracks",
  windowMs: 60_000,
  maxRequests: 30,
  softLimitRatio: 0.85,
} as const;

const TIME_RANGES = ["short_term", "medium_term", "long_term"] as const;

type SpotifyPagingTopTracks = {
  items?: unknown[];
  total?: number;
  limit?: number;
  offset?: number;
  href?: string;
  next?: string | null;
  previous?: string | null;
};

function parseTimeRange(
  raw: string | null
): (typeof TIME_RANGES)[number] {
  if (raw == null || raw === "") return "medium_term";
  if ((TIME_RANGES as readonly string[]).includes(raw)) {
    return raw as (typeof TIME_RANGES)[number];
  }
  throw createValidationError(
    `Invalid time_range (allowed: ${TIME_RANGES.join(", ")})`,
    { time_range: raw }
  );
}

function unwrapOptionalInt(
  param: string | null,
  options: { min: number; max: number; fallback: number }
): number {
  if (param == null || param === "") return options.fallback;
  const v = validateOptionalInteger(param, {
    min: options.min,
    max: options.max,
  });
  if (typeof v === "object" && v !== null && "error" in v) {
    throw createValidationError(v.error);
  }
  if (typeof v !== "number") {
    throw createValidationError("Entier invalide");
  }
  return v;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    const { searchParams } = new URL(request.url);
    const time_range = parseTimeRange(searchParams.get("time_range"));
    const limit = unwrapOptionalInt(searchParams.get("limit"), {
      min: 1,
      max: 50,
      fallback: 20,
    });
    const offset = unwrapOptionalInt(searchParams.get("offset"), {
      min: 0,
      max: 10_000,
      fallback: 0,
    });

    const { accessToken } = await getValidSpotifyAccessTokenForUser(userId);

    const qs = new URLSearchParams({
      time_range,
      limit: String(limit),
      offset: String(offset),
    });

    const result = await spotifyFetchJson<SpotifyPagingTopTracks>(
      `/me/top/tracks?${qs.toString()}`,
      accessToken
    );

    if (!result.ok) {
      if (result.status === 429) {
        throw new AppError(
          429,
          "Spotify rate limit; try again later.",
          ErrorCodes.RATE_LIMIT_EXCEEDED
        );
      }
      throw new AppError(
        result.status === 401 || result.status === 403 ? 401 : 502,
        parseSpotifyApiErrorMessage(result.bodyText) ??
          `Spotify top tracks HTTP ${result.status}`,
        result.status === 401 || result.status === 403
          ? ErrorCodes.UNAUTHORIZED
          : ErrorCodes.EXTERNAL_API_ERROR
      );
    }

    return NextResponse.json({
      ok: true,
      time_range,
      limit,
      offset,
      data: result.data,
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
