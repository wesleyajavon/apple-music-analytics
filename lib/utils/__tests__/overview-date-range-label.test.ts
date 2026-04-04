import { describe, it, expect } from "vitest";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";

describe("formatOverviewDateRangeLabel", () => {
  it("returns empty string when startDate is missing", () => {
    expect(formatOverviewDateRangeLabel(undefined, "2024-01-01")).toBe("");
  });

  it("returns empty string when endDate is missing", () => {
    expect(formatOverviewDateRangeLabel("2024-01-01", undefined)).toBe("");
  });

  it("returns empty string when both dates are missing", () => {
    expect(formatOverviewDateRangeLabel()).toBe("");
  });

  it("formats range with en-US month labels", () => {
    const s = formatOverviewDateRangeLabel("2024-01-15", "2024-06-20", "en-US");
    expect(s).toContain("2024");
    expect(s).toContain("–");
    expect(s).toMatch(/Jan/i);
  });

  it("applies locale so output differs from another locale", () => {
    const en = formatOverviewDateRangeLabel("2024-03-01", "2024-03-02", "en-US");
    const fr = formatOverviewDateRangeLabel("2024-03-01", "2024-03-02", "fr-FR");
    expect(en.length).toBeGreaterThan(0);
    expect(fr.length).toBeGreaterThan(0);
    expect(en).not.toBe(fr);
  });
});
