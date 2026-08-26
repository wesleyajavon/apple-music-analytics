import { describe, expect, it } from "vitest";
import {
  buildArtistDeepDiveCacheSuffix,
  extractArtistNameFromDeepDiveUserMessage,
  formatArtistDeepDivePresetAnswer,
  inferArtistDeepDiveFromMessages,
  inferArtistDeepDiveFromUserMessage,
  isArtistDeepDiveToolResult,
  resolveArtistNameForDeepDivePreset,
} from "@/lib/services/ai/music-chat-artist-deep-dive-direct-answer";

describe("music-chat-artist-deep-dive-direct-answer", () => {
  it("infers free-text artist deep dives without calling Groq phrasing", () => {
    expect(inferArtistDeepDiveFromUserMessage("deepdive Jeune morty")).toBe(
      "Jeune morty"
    );
    expect(
      inferArtistDeepDiveFromUserMessage("artist deep-dive: The Strokes")
    ).toBe("The Strokes");
    expect(
      inferArtistDeepDiveFromUserMessage("fais un deepdive sur Jeune Morty")
    ).toBe("Jeune Morty");
    expect(
      inferArtistDeepDiveFromUserMessage(
        "Tell me my streaming history with Radiohead."
      )
    ).toBe("Radiohead");
    expect(
      inferArtistDeepDiveFromUserMessage(
        "Raconte-moi mon historique de streams avec Daft Punk"
      )
    ).toBe("Daft Punk");
    expect(
      inferArtistDeepDiveFromUserMessage("tell me about Jeune morty")
    ).toBe("Jeune morty");
    expect(
      inferArtistDeepDiveFromUserMessage("Can you tell me about The Strokes")
    ).toBe("The Strokes");
    expect(
      inferArtistDeepDiveFromUserMessage("what about Radiohead")
    ).toBe("Radiohead");
    expect(
      inferArtistDeepDiveFromUserMessage("parle-moi de Daft Punk")
    ).toBe("Daft Punk");
    expect(
      inferArtistDeepDiveFromUserMessage("who is artist Jeune Morty")
    ).toBe("Jeune Morty");
    expect(
      inferArtistDeepDiveFromMessages([
        { role: "assistant", content: "Hi" },
        { role: "user", content: "deep dive Jeune morty" },
      ])
    ).toBe("Jeune morty");
  });

  it("does not infer deep dives for unrelated or comparative questions", () => {
    expect(
      inferArtistDeepDiveFromUserMessage(
        "Which tracks was I obsessed with in short bursts this year?"
      )
    ).toBeNull();
    expect(
      inferArtistDeepDiveFromUserMessage("Create a playlist from my favorites")
    ).toBeNull();
    expect(
      inferArtistDeepDiveFromUserMessage("deepdive Drake vs Kendrick")
    ).toBeNull();
    expect(
      inferArtistDeepDiveFromUserMessage(
        "Tell me my streaming history with Radiohead in 2022"
      )
    ).toBeNull();
    expect(inferArtistDeepDiveFromUserMessage("tell me about my top tracks")).toBeNull();
    expect(inferArtistDeepDiveFromUserMessage("tell me about late night")).toBeNull();
  });

  it("extracts artist names from preset-style questions", () => {
    expect(
      extractArtistNameFromDeepDiveUserMessage(
        "Tell me my listening history with The Strokes."
      )
    ).toBe("The Strokes");
    expect(
      extractArtistNameFromDeepDiveUserMessage(
        "Raconte-moi mon historique d’écoute avec Daft Punk."
      )
    ).toBe("Daft Punk");
    expect(
      extractArtistNameFromDeepDiveUserMessage(
        "Cuéntame mi historial de escucha con Bad Bunny."
      )
    ).toBe("Bad Bunny");
  });

  it("resolves artist from presetArgs first", () => {
    expect(
      resolveArtistNameForDeepDivePreset(
        { artistName: "  Nina Simone " },
        [{ role: "user", content: "Tell me my listening history with X." }]
      )
    ).toBe("Nina Simone");
  });

  it("builds a normalized cache suffix", () => {
    expect(
      buildArtistDeepDiveCacheSuffix({ artistName: "Édith Piaf" }, [])
    ).toBe("edith piaf");
  });

  it("validates tool result shape", () => {
    expect(
      isArtistDeepDiveToolResult({
        found: false,
        requestedArtistName: "nobody",
        period: { startDate: null, endDate: null },
        topTracks: [],
        yearlyBreakdown: [],
      })
    ).toBe(true);
    expect(isArtistDeepDiveToolResult({})).toBe(false);
  });

  it("formats a found deep dive in English", () => {
    const text = formatArtistDeepDivePresetAnswer("en", {
      found: true,
      requestedArtistName: "Radiohead",
      period: { startDate: null, endDate: null },
      totalListens: 40,
      uniqueTracks: 8,
      artist: { artistId: "a1", artistName: "Radiohead" },
      firstListenAt: "2020-01-01T12:00:00.000Z",
      lastListenAt: "2024-06-01T12:00:00.000Z",
      topTracks: [
        {
          title: "Weird Fishes",
          listenCount: 12,
          genre: "Rock",
          firstListenAt: "2020-01-01T12:00:00.000Z",
          lastListenAt: "2024-01-01T12:00:00.000Z",
        },
      ],
      yearlyBreakdown: [
        { year: 2023, listenCount: 20, uniqueTracks: 5 },
      ],
    });
    expect(text).toContain("Radiohead");
    expect(text).toContain("Weird Fishes");
    expect(text).toContain("2023");
    expect(text).toContain("40 total streams");
  });
});
