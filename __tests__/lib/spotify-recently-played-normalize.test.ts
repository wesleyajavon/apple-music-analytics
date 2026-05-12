import { describe, expect, it } from "vitest";
import { spotifyRecentlyPlayedItemsToNormalized } from "@/lib/services/spotify/recently-played-normalize";

describe("spotifyRecentlyPlayedItemsToNormalized", () => {
  it("maps track plays with primary artist", () => {
    const rows = spotifyRecentlyPlayedItemsToNormalized([
      {
        played_at: "2024-05-01T12:00:00.000Z",
        track: {
          type: "track",
          name: "Song A",
          artists: [{ name: "Artist One" }, { name: "Feat" }],
        },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      artistName: "Artist One",
      trackName: "Song A",
      playedAt: new Date("2024-05-01T12:00:00.000Z"),
    });
  });

  it("skips episodes and rows without artist or title", () => {
    expect(
      spotifyRecentlyPlayedItemsToNormalized([
        {
          played_at: "2024-05-01T12:00:00.000Z",
          track: { type: "episode", name: "Podcast", artists: [{ name: "Host" }] },
        },
        { played_at: "2024-05-01T12:00:00.000Z", track: { type: "track", name: "", artists: [{ name: "X" }] } },
        { played_at: "2024-05-01T12:00:00.000Z", track: { type: "track", name: "Y", artists: [] } },
      ])
    ).toHaveLength(0);
  });
});
