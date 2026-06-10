import { describe, it, expect } from "vitest";
import { intersectTopArtists, type TopArtistListenRow } from "@/lib/services/duet/shared-artists";

function row(
  artistId: string,
  artistName: string,
  listenCount: number,
  rank: number
): TopArtistListenRow {
  return { artistId, artistName, listenCount, rank };
}

describe("intersectTopArtists", () => {
  it("returns shared artists sorted by combined listens", () => {
    const selfTop = [
      row("a1", "Alpha", 100, 1),
      row("a2", "Beta", 50, 2),
      row("a3", "Gamma", 10, 3),
    ];
    const friendTop = [
      row("a2", "Beta", 80, 1),
      row("a1", "Alpha", 40, 2),
      row("a4", "Delta", 5, 3),
    ];

    const result = intersectTopArtists(selfTop, friendTop, 10);

    expect(result).toHaveLength(2);
    expect(result[0].artistId).toBe("a1");
    expect(result[0].combinedCount).toBe(140);
    expect(result[0].winner).toBe("self");
    expect(result[1].artistId).toBe("a2");
    expect(result[1].combinedCount).toBe(130);
    expect(result[1].winner).toBe("friend");
  });

  it("marks ties when listen counts match", () => {
    const selfTop = [row("a1", "Alpha", 42, 1)];
    const friendTop = [row("a1", "Alpha", 42, 1)];

    const result = intersectTopArtists(selfTop, friendTop, 5);

    expect(result).toEqual([
      expect.objectContaining({
        artistId: "a1",
        winner: "tie",
        combinedCount: 84,
      }),
    ]);
  });

  it("respects the result limit", () => {
    const selfTop = [row("a1", "A", 1, 1), row("a2", "B", 1, 2)];
    const friendTop = [row("a1", "A", 1, 1), row("a2", "B", 1, 2)];

    expect(intersectTopArtists(selfTop, friendTop, 1)).toHaveLength(1);
  });

  it("returns empty when there is no overlap", () => {
    const selfTop = [row("a1", "Alpha", 10, 1)];
    const friendTop = [row("a2", "Beta", 10, 1)];

    expect(intersectTopArtists(selfTop, friendTop, 10)).toEqual([]);
  });
});
