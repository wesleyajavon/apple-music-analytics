import { describe, it, expect } from "vitest";
import {
  getProfileDateRangeParts,
  getProfileDateSpanDays,
  getProfileDurationParts,
} from "@/lib/utils/musical-profile-date-range";

describe("getProfileDateSpanDays", () => {
  it("counts inclusive calendar days", () => {
    expect(getProfileDateSpanDays("2024-01-01", "2024-01-01")).toBe(1);
    expect(getProfileDateSpanDays("2024-01-01", "2024-01-07")).toBe(7);
  });
});

describe("getProfileDateRangeParts", () => {
  it("returns null when dates are missing", () => {
    expect(getProfileDateRangeParts(undefined, "2024-01-01", "fr-FR")).toBeNull();
    expect(getProfileDateRangeParts("2024-01-01", undefined, "fr-FR")).toBeNull();
  });

  it("formats a single day without an end label", () => {
    const parts = getProfileDateRangeParts("2024-03-15", "2024-03-15", "en-US");
    expect(parts?.isSingleDay).toBe(true);
    expect(parts?.endLabel).toBeNull();
    expect(parts?.fullLabel).toContain("2024");
  });

  it("shortens ranges within the same month", () => {
    const parts = getProfileDateRangeParts("2024-03-03", "2024-03-28", "en-US");
    expect(parts?.isSingleDay).toBe(false);
    expect(parts?.startLabel).toBe("3");
    expect(parts?.endLabel).toMatch(/28/i);
    expect(parts?.fullLabel).toContain(" – ");
  });

  it("keeps both years when the range crosses years", () => {
    const parts = getProfileDateRangeParts("2023-12-28", "2024-01-03", "en-US");
    expect(parts?.startLabel).toContain("2023");
    expect(parts?.endLabel).toContain("2024");
  });
});

describe("getProfileDurationParts", () => {
  it("buckets short ranges as days", () => {
    expect(getProfileDurationParts("2024-01-01", "2024-01-14").bucket).toBe("days");
  });

  it("buckets medium ranges as months", () => {
    expect(getProfileDurationParts("2024-01-01", "2024-04-01").bucket).toBe("months");
  });

  it("buckets long ranges as years", () => {
    const parts = getProfileDurationParts("2020-01-01", "2024-06-01");
    expect(["years", "yearsMonths"]).toContain(parts.bucket);
  });
});
