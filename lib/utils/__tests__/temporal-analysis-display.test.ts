import { describe, expect, it } from "vitest";
import {
  formatHourForDisplay,
  getClockHandAngle,
  getDayPartId,
  getRhythmKey,
} from "@/lib/utils/temporal-analysis-display";

describe("temporal-analysis-display", () => {
  it("maps hours to the four day-part bands", () => {
    expect(getRhythmKey(0)).toBe("rhythmNightOwl");
    expect(getRhythmKey(5)).toBe("rhythmNightOwl");
    expect(getRhythmKey(6)).toBe("rhythmMorningPerson");
    expect(getRhythmKey(11)).toBe("rhythmMorningPerson");
    expect(getRhythmKey(12)).toBe("rhythmAfternoon");
    expect(getRhythmKey(17)).toBe("rhythmAfternoon");
    expect(getRhythmKey(18)).toBe("rhythmEvening");
    expect(getRhythmKey(23)).toBe("rhythmEvening");
  });

  it("aligns day-part ids with rhythm keys", () => {
    expect(getDayPartId(3)).toBe("night");
    expect(getDayPartId(9)).toBe("morning");
    expect(getDayPartId(15)).toBe("afternoon");
    expect(getDayPartId(21)).toBe("evening");
  });

  it("formats English hours in 12h and other locales in 24h", () => {
    expect(formatHourForDisplay(0, "en-US")).toMatch(/12/i);
    expect(formatHourForDisplay(21, "fr-FR")).toMatch(/21/);
  });

  it("places hour 0 at the top of the clock", () => {
    expect(getClockHandAngle(0)).toBe(-90);
    expect(getClockHandAngle(6)).toBe(0);
  });
});
