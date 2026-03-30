import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../genre/genre-service", () => ({
  ARTIST_TO_GENRE_MAP: {},
}));

import { prisma } from "../../prisma";
import {
  getGenreDistribution,
  getGenreTrends,
  getTopArtistsForGenres,
} from "../listening/listening-stats";

/**
 * Branches SQL simplifiées quand ARTIST_TO_GENRE_MAP est vide
 * (module mocké isolément de listening.test.ts).
 */
describe("listening-stats (empty ARTIST_TO_GENRE_MAP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getGenreDistribution aggregates with COALESCE(t.genre) only", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { genre: "Pop", count: BigInt(2) },
    ]);

    const result = await getGenreDistribution();

    expect(result).toEqual([{ genre: "Pop", count: 2 }]);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("getGenreTrends uses day aggregation without artist map join", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      { date: "2024-01-10", genre: "Rock", count: BigInt(1) },
    ]);

    const result = await getGenreTrends(
      new Date("2024-01-01"),
      new Date("2024-01-31"),
      "day"
    );

    expect(result[0]).toEqual({ date: "2024-01-10", genre: "Rock", count: 1 });
  });

  it("getTopArtistsForGenres uses CTE without VALUES genre map", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([
      {
        genre: "Pop",
        artist_id: "x",
        artist_name: "Artist",
        image_url: null,
        listen_count: BigInt(3),
      },
    ]);

    const result = await getTopArtistsForGenres(
      ["Pop"],
      new Date("2024-01-01"),
      new Date("2024-01-31"),
      "user-1"
    );

    expect(result[0].artists[0].listenCount).toBe(3);
  });
});
