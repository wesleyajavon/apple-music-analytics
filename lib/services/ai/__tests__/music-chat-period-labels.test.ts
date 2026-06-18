import { describe, expect, it } from "vitest";
import {
  formatPeriodRangeLabel,
  formatTasteShiftPresetAnswer,
} from "@/lib/services/ai/music-chat-quick-preset-formatters";

describe("formatPeriodRangeLabel", () => {
  it("uses calendar year for full-year ranges", () => {
    expect(
      formatPeriodRangeLabel("2020-01-01", "2020-12-31", "en")
    ).toBe("2020");
    expect(
      formatPeriodRangeLabel("2024-01-01", "2024-12-31", "fr")
    ).toBe("2024");
  });

  it("uses month and year for full-month ranges", () => {
    expect(
      formatPeriodRangeLabel("2024-06-01", "2024-06-30", "en")
    ).toBe("June 2024");
  });

  it("uses medium dates for arbitrary ranges", () => {
    const label = formatPeriodRangeLabel("2024-04-24", "2024-06-18", "en");
    expect(label).toContain("2024");
    expect(label).not.toContain("2024-04-24");
  });
});

describe("formatTasteShiftPresetAnswer", () => {
  it("renders human-friendly period labels in the intro", () => {
    const answer = formatTasteShiftPresetAnswer("en", {
      periods: {
        first: {
          startDate: "2020-01-01",
          endDate: "2020-12-31",
          topArtists: [{ artistName: "Radiohead", listenCount: 12 }],
        },
        second: {
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          topArtists: [{ artistName: "Khruangbin", listenCount: 8 }],
        },
      },
      deltas: { artists: { rising: [], declining: [] }, genres: { rising: [], declining: [] } },
    });

    expect(answer).toContain("Taste shift between 2020 and 2024:");
    expect(answer).toContain("First period (2020):");
    expect(answer).toContain("Second period (2024):");
    expect(answer).not.toContain("2020-01-01");
  });
});
