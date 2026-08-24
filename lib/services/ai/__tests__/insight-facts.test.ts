import { describe, expect, it } from "vitest";
import {
  pickInsightFacts,
  formatInsightFactsForPrompt,
  buildFallbackMoments,
  type InsightFact,
} from "../insight-facts";
import type { AiLocale } from "../locale-utils";

function fact(kind: InsightFact["kind"], score: number, id: string = kind): InsightFact {
  const copy: Record<AiLocale, string> = { en: kind, fr: kind, es: kind };
  return {
    id,
    kind,
    score,
    metric: String(score),
    href: "/dashboard/artists",
    promptLine: `${kind} fact`,
    fallbackTitle: copy,
    fallbackBody: copy,
  };
}

describe("pickInsightFacts", () => {
  it("prefers one of each kind before duplicates", () => {
    const picked = pickInsightFacts([
      fact("oneHit", 10),
      fact("oneHit", 9, "oneHit-b"),
      fact("comeback", 4),
      fact("genreSlot", 3),
      fact("firstHeard", 2),
      fact("catalog", 8),
    ]);
    expect(picked.map((row) => row.kind)).toEqual([
      "oneHit",
      "catalog",
      "comeback",
      "genreSlot",
    ]);
  });

  it("caps at four facts", () => {
    const picked = pickInsightFacts([
      fact("oneHit", 5),
      fact("catalog", 4),
      fact("comeback", 3),
      fact("genreSlot", 2),
      fact("firstHeard", 1),
    ]);
    expect(picked).toHaveLength(4);
  });
});

describe("formatInsightFactsForPrompt", () => {
  it("includes fact ids and forbids isolated tops", () => {
    const text = formatInsightFactsForPrompt([fact("comeback", 3)]);
    expect(text).toContain("[id=comeback]");
    expect(text).toMatch(/top genre/i);
    expect(text).toMatch(/peak hour/i);
  });
});

describe("buildFallbackMoments", () => {
  it("keeps kind, metric, and href from the fact", () => {
    const moments = buildFallbackMoments([fact("comeback", 3)], "fr");
    expect(moments).toEqual([
      {
        id: "comeback",
        kind: "comeback",
        title: "comeback",
        body: "comeback",
        metric: "3",
        href: "/dashboard/artists",
      },
    ]);
  });

  it("copies artistId so the UI can open the artist overlay", () => {
    const withArtist = fact("oneHit", 9, "oneHit:elton");
    withArtist.artistId = "artist-elton";
    withArtist.artistName = "Elton John";
    const [moment] = buildFallbackMoments([withArtist], "en");
    expect(moment?.artistId).toBe("artist-elton");
    expect(moment?.artistName).toBe("Elton John");
  });
});
