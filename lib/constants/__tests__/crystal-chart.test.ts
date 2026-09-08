import { describe, expect, it } from "vitest";
import {
  CRYSTAL_SERIES_COLORS_DARK,
  CRYSTAL_SERIES_COLORS_LIGHT,
  getCrystalSeriesColor,
} from "@/lib/constants/crystal-chart";

describe("getCrystalSeriesColor", () => {
  it("starts with Soundprint violet, rose, cyan in light", () => {
    expect(getCrystalSeriesColor(0, "light")).toBe("#9850d0");
    expect(getCrystalSeriesColor(1, "light")).toBe("#f04068");
    expect(getCrystalSeriesColor(2, "light")).toBe("#4f90e0");
  });

  it("wraps after the palette length", () => {
    expect(getCrystalSeriesColor(CRYSTAL_SERIES_COLORS_LIGHT.length, "light")).toBe(
      CRYSTAL_SERIES_COLORS_LIGHT[0]
    );
    expect(getCrystalSeriesColor(CRYSTAL_SERIES_COLORS_DARK.length + 2, "dark")).toBe(
      CRYSTAL_SERIES_COLORS_DARK[2]
    );
  });

  it("falls back to the first swatch for invalid indexes", () => {
    expect(getCrystalSeriesColor(-1, "light")).toBe(CRYSTAL_SERIES_COLORS_LIGHT[0]);
    expect(getCrystalSeriesColor(Number.NaN, "dark")).toBe(CRYSTAL_SERIES_COLORS_DARK[0]);
  });
});
