import { describe, expect, it } from "vitest";
import {
  formatTopArtistsPresetAnswer,
  isTopArtistsPeriodToolResult,
} from "@/lib/services/ai/music-chat-top-artists-direct-answer";

describe("music-chat-top-artists-direct-answer", () => {
  it("formats a non-empty EN answer with listens and unique tracks", () => {
    const answer = formatTopArtistsPresetAnswer("en", {
      period: { startDate: "2026-01-01", endDate: "2026-12-31" },
      artists: [
        {
          artistName: "A",
          listenCount: 5,
          uniqueTracks: 2,
          firstListenAt: "2026-04-01T00:00:00.000Z",
          lastListenAt: "2026-06-01T00:00:00.000Z",
        },
        {
          artistName: "B",
          listenCount: 3,
          uniqueTracks: 1,
          firstListenAt: "2026-01-05T00:00:00.000Z",
          lastListenAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    });
    expect(answer).toContain("- A (5 streams, 2 unique tracks)");
    expect(answer).toContain("- B (3 streams, 1 unique track)");
    expect(answer).toContain("Your top artists");
    expect(answer).toContain("first stream");
    expect(answer).toContain("Jan 5, 2026");
    expect(answer).toContain("Jun 1, 2026");
  });

  it("handles empty ES artists", () => {
    const answer = formatTopArtistsPresetAnswer("es", {
      period: { startDate: "2020-01-01", endDate: "2020-12-31" },
      artists: [],
    });
    expect(answer).toContain("No hay streams");
  });

  it("isTopArtistsPeriodToolResult narrows payloads", () => {
    expect(
      isTopArtistsPeriodToolResult({
        period: { startDate: "2026-01-01", endDate: "2026-12-31" },
        artists: [],
      })
    ).toBe(true);
    expect(
      isTopArtistsPeriodToolResult({ period: {}, artists: [] })
    ).toBe(false);
  });
});
