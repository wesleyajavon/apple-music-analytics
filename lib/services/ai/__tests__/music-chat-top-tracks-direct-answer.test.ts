import { describe, expect, it } from "vitest";
import {
  formatTopTracksPresetAnswer,
  isTopTracksPeriodToolResult,
} from "@/lib/services/ai/music-chat-top-tracks-direct-answer";

describe("music-chat-top-tracks-direct-answer", () => {
  it("formats a non-empty EN answer with bullets and span", () => {
    const answer = formatTopTracksPresetAnswer("en", {
      period: { startDate: "2026-01-01", endDate: "2026-12-31" },
      tracks: [
        {
          title: "Alpha",
          artistName: "Artist A",
          listenCount: 10,
          firstListenAt: "2026-03-01T10:00:00.000Z",
          lastListenAt: "2026-06-15T22:00:00.000Z",
        },
        {
          title: "Beta",
          artistName: "Artist B",
          listenCount: 2,
          firstListenAt: "2026-01-02T08:00:00.000Z",
          lastListenAt: "2026-04-20T12:00:00.000Z",
        },
      ],
    });
    expect(answer).toContain("- Alpha — Artist A (10 listens)");
    expect(answer).toContain("- Beta — Artist B (2 listens)");
    expect(answer).toContain("Your most-played tracks");
    expect(answer).toContain("Jan 1, 2026");
    expect(answer).toContain("Dec 31, 2026");
    expect(answer).toContain("first play in this ranking was on");
    expect(answer).toContain("Jan 2, 2026");
    expect(answer).toContain("Jun 15, 2026");
    expect(answer).toContain("imported");
  });

  it("uses FR singular listen count", () => {
    const answer = formatTopTracksPresetAnswer("fr", {
      period: { startDate: "2025-01-01", endDate: "2025-12-31" },
      tracks: [
        {
          title: "Solo",
          artistName: "Artiste X",
          listenCount: 1,
          firstListenAt: "2025-07-01T00:00:00.000Z",
          lastListenAt: "2025-07-01T01:00:00.000Z",
        },
      ],
    });
    expect(answer).toContain("(1 écoute)");
  });

  it("handles empty FR tracks", () => {
    const answer = formatTopTracksPresetAnswer("fr", {
      period: { startDate: "2020-01-01", endDate: "2020-12-31" },
      tracks: [],
    });
    expect(answer).toContain("Aucune écoute");
    expect(answer).toContain("importé");
  });

  it("isTopTracksPeriodToolResult narrows payloads", () => {
    expect(
      isTopTracksPeriodToolResult({
        period: { startDate: "2026-01-01", endDate: "2026-12-31" },
        tracks: [],
      })
    ).toBe(true);
    expect(isTopTracksPeriodToolResult({ period: {}, tracks: [] })).toBe(false);
    expect(isTopTracksPeriodToolResult(null)).toBe(false);
  });
});
