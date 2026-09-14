import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/artists/[artistId]/image/route";

vi.mock("@/lib/auth/resolve-authorized-data-user-id", () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));
vi.mock("@/lib/security/rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listen: { findFirst: vi.fn() },
    artist: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/services/spotify/artist-image-enrichment", () => ({
  getSpotifyClientCredentialsFromEnv: vi.fn(() => null),
  enrichArtistImageFromSpotifyIfMissing: vi.fn(),
}));

import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { prisma } from "@/lib/prisma";

const PUBLIC_ID = "1bbbb9f2-3f82-469b-a50d-fc3b4f48bb21";
const ARTIST_ID = "artist-1";

describe("POST /api/artists/[artistId]/image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows public profile viewer to hydrate artist images", async () => {
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: PUBLIC_ID,
    });
    vi.mocked(prisma.listen.findFirst).mockResolvedValue({ id: "listen-1" } as never);
    vi.mocked(prisma.artist.findUnique).mockResolvedValue({
      imageUrl: "https://i.scdn.co/image/public-artist",
    } as never);

    const request = new NextRequest(
      `http://localhost/api/artists/${ARTIST_ID}/image?userId=${PUBLIC_ID}`,
      { method: "POST" }
    );
    const response = await POST(request, { params: { artistId: ARTIST_ID } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.imageUrl).toBe("https://i.scdn.co/image/public-artist");
    expect(prisma.listen.findFirst).toHaveBeenCalledWith({
      where: { userId: PUBLIC_ID, track: { artistId: ARTIST_ID } },
      select: { id: true },
    });
  });

  it("returns 401 when data access is unauthorized", async () => {
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const request = new NextRequest(
      `http://localhost/api/artists/${ARTIST_ID}/image`,
      { method: "POST" }
    );
    const response = await POST(request, { params: { artistId: ARTIST_ID } });

    expect(response.status).toBe(401);
    expect(prisma.listen.findFirst).not.toHaveBeenCalled();
  });
});
