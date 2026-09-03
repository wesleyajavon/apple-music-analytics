import { describe, expect, it } from "vitest";
import { genreCoverageLiveDotTone } from "@/lib/utils/genre-coverage-live-dot";

describe("genreCoverageLiveDotTone", () => {
  it("stays amber until eligibility has loaded", () => {
    expect(genreCoverageLiveDotTone(0, false)).toBe("amber");
    expect(genreCoverageLiveDotTone(12, false)).toBe("amber");
  });

  it("stays amber while some tracks still need a genre", () => {
    expect(genreCoverageLiveDotTone(1, true)).toBe("amber");
    expect(genreCoverageLiveDotTone(42, true)).toBe("amber");
  });

  it("turns emerald once every track is mapped", () => {
    expect(genreCoverageLiveDotTone(0, true)).toBe("emerald");
  });

  it("stays amber when eligibility is unavailable", () => {
    expect(genreCoverageLiveDotTone(null, true)).toBe("amber");
    expect(genreCoverageLiveDotTone(undefined, true)).toBe("amber");
  });
});
