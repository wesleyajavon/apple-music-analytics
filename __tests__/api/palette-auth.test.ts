import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as GETSession } from "@/app/api/palette/session/route";
import { GET as GETSuggestions } from "@/app/api/palette/suggestions/route";
import { POST as POSTMap } from "@/app/api/palette/map/route";
import { POST as POSTSkip } from "@/app/api/palette/skip/route";

vi.mock("@/lib/auth/require-auth-user-id", () => ({
  requireAuthenticatedUserId: vi.fn(),
  unauthorizedResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  ),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));

vi.mock("@/lib/services/palette/palette-service", () => ({
  getPaletteSession: vi.fn(),
  mapPaletteArtistGenre: vi.fn(),
  mapPaletteTrackGenre: vi.fn(),
  parsePaletteMode: vi.fn((mode?: string | null) =>
    mode === "tracks" ? "tracks" : "artists"
  ),
  skipPaletteArtist: vi.fn(),
  skipPaletteTrack: vi.fn(),
}));

vi.mock("@/lib/services/palette/palette-suggestions-service", () => ({
  getPaletteSuggestions: vi.fn(),
  recordPaletteSuggestionDecision: vi.fn(),
}));

import { requireAuthenticatedUserId } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import {
  getPaletteSession,
  mapPaletteArtistGenre,
  mapPaletteTrackGenre,
  parsePaletteMode,
  skipPaletteArtist,
  skipPaletteTrack,
} from "@/lib/services/palette/palette-service";
import { getPaletteSuggestions } from "@/lib/services/palette/palette-suggestions-service";

const PUBLIC_PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const EMPTY_SESSION = {
  mode: "artists" as const,
  progress: {
    totalInQueue: 0,
    mapped: 0,
    skipped: 0,
    remaining: 0,
    completionRatio: 1,
  },
  nextArtist: null,
  nextTrack: null,
  existingGenres: [],
  compactTrends: [],
  unknownListensTotal: 0,
  mappedListensTotal: 0,
};

describe("Palette API auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue(null);
  });

  it.each([
    [
      "GET /api/palette/session",
      GETSession,
      "http://localhost/api/palette/session",
      undefined,
    ],
    [
      "GET /api/palette/suggestions",
      GETSuggestions,
      "http://localhost/api/palette/suggestions?mode=artists&artistId=artist-1",
      undefined,
    ],
    [
      "POST /api/palette/map",
      POSTMap,
      "http://localhost/api/palette/map",
      {
        mode: "artists",
        artistId: "artist-1",
        genre: "Soul",
        userId: PUBLIC_PROFILE_ID,
      },
    ],
    [
      "POST /api/palette/skip",
      POSTSkip,
      "http://localhost/api/palette/skip",
      { mode: "artists", artistId: "artist-1", userId: PUBLIC_PROFILE_ID },
    ],
  ])(
    "returns 401 for anonymous public-profile requests to %s",
    async (_name, handler, url, body) => {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set("userId", PUBLIC_PROFILE_ID);
      const request = new NextRequest(requestUrl, {
        method: body ? "POST" : "GET",
        body: body ? JSON.stringify(body) : undefined,
        headers: body ? { "Content-Type": "application/json" } : undefined,
      });

      const response = await handler(request);

      expect(response.status).toBe(401);
      expect(assertRateLimit).not.toHaveBeenCalled();
      expect(getPaletteSession).not.toHaveBeenCalled();
      expect(getPaletteSuggestions).not.toHaveBeenCalled();
      expect(mapPaletteArtistGenre).not.toHaveBeenCalled();
      expect(mapPaletteTrackGenre).not.toHaveBeenCalled();
      expect(skipPaletteArtist).not.toHaveBeenCalled();
      expect(skipPaletteTrack).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["POST /api/palette/map", POSTMap, "http://localhost/api/palette/map"],
    ["POST /api/palette/skip", POSTSkip, "http://localhost/api/palette/skip"],
  ])(
    "returns 401 before parsing invalid anonymous write bodies for %s",
    async (_name, handler, url) => {
      const request = new NextRequest(`${url}?userId=${PUBLIC_PROFILE_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      });

      const response = await handler(request);

      expect(response.status).toBe(401);
      expect(assertRateLimit).not.toHaveBeenCalled();
      expect(mapPaletteArtistGenre).not.toHaveBeenCalled();
      expect(mapPaletteTrackGenre).not.toHaveBeenCalled();
      expect(skipPaletteArtist).not.toHaveBeenCalled();
      expect(skipPaletteTrack).not.toHaveBeenCalled();
    }
  );

  it("uses the authenticated session user for session even when public userId is present", async () => {
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue("session-user");
    vi.mocked(getPaletteSession).mockResolvedValue({
      ...EMPTY_SESSION,
      mode: "tracks",
    });

    const request = new NextRequest(
      `http://localhost/api/palette/session?mode=tracks&userId=${PUBLIC_PROFILE_ID}`
    );

    const response = await GETSession(request);

    expect(response.status).toBe(200);
    expect(parsePaletteMode).toHaveBeenCalledWith("tracks");
    expect(getPaletteSession).toHaveBeenCalledWith("session-user", "tracks");
  });

  it("uses the authenticated session user for suggestions even when public userId is present", async () => {
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue("session-user");
    vi.mocked(getPaletteSuggestions).mockResolvedValue([]);

    const request = new NextRequest(
      `http://localhost/api/palette/suggestions?mode=artists&artistId=artist-1&userId=${PUBLIC_PROFILE_ID}`
    );

    const response = await GETSuggestions(request);

    expect(response.status).toBe(200);
    expect(getPaletteSuggestions).toHaveBeenCalledWith({
      userId: "session-user",
      mode: "artists",
      artistId: "artist-1",
      trackId: undefined,
    });
  });

  it("uses the authenticated session user for map even when public userId is present in query and body", async () => {
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue("session-user");
    vi.mocked(mapPaletteArtistGenre).mockResolvedValue({
      updatedTracks: 1,
      unknownListensRemoved: 2,
      normalizedGenre: "Soul",
    });
    vi.mocked(getPaletteSession).mockResolvedValue(EMPTY_SESSION);

    const request = new NextRequest(
      `http://localhost/api/palette/map?userId=${PUBLIC_PROFILE_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "artists",
          artistId: "artist-1",
          genre: "Soul",
          userId: PUBLIC_PROFILE_ID,
        }),
      }
    );

    const response = await POSTMap(request);

    expect(response.status).toBe(200);
    expect(mapPaletteArtistGenre).toHaveBeenCalledWith(
      "session-user",
      "artist-1",
      "Soul"
    );
    expect(getPaletteSession).toHaveBeenCalledWith("session-user", "artists");
  });

  it("uses the authenticated session user for skip even when public userId is present in query and body", async () => {
    vi.mocked(requireAuthenticatedUserId).mockResolvedValue("session-user");
    vi.mocked(skipPaletteArtist).mockResolvedValue(undefined);
    vi.mocked(getPaletteSession).mockResolvedValue(EMPTY_SESSION);

    const request = new NextRequest(
      `http://localhost/api/palette/skip?userId=${PUBLIC_PROFILE_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "artists",
          artistId: "artist-1",
          userId: PUBLIC_PROFILE_ID,
        }),
      }
    );

    const response = await POSTSkip(request);

    expect(response.status).toBe(200);
    expect(skipPaletteArtist).toHaveBeenCalledWith("session-user", "artist-1");
    expect(getPaletteSession).toHaveBeenCalledWith("session-user", "artists");
  });
});
