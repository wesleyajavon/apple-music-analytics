import { describe, expect, it } from "vitest";
import { unknownListenSharePercent } from "@/lib/utils/genre-unknown-label";

describe("unknownListenSharePercent", () => {
  it("returns 0 when there is no Unknown row", () => {
    expect(
      unknownListenSharePercent([
        { genre: "Hip-Hop", percentage: 60 },
        { genre: "R&B", percentage: 40 },
      ])
    ).toBe(0);
  });

  it("returns the Unknown listen share", () => {
    expect(
      unknownListenSharePercent([
        { genre: "Unknown", percentage: 72.4 },
        { genre: "Hip-Hop", percentage: 27.6 },
      ])
    ).toBe(72.4);
  });
});
