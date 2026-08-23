export const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export type TemporalRhythmKey =
  | "rhythmNightOwl"
  | "rhythmMorningPerson"
  | "rhythmAfternoon"
  | "rhythmEvening";

export type TemporalDayPartId = "night" | "morning" | "afternoon" | "evening";

export const TEMPORAL_DAY_PARTS = [
  { id: "night" as const, startHour: 0, endHour: 5 },
  { id: "morning" as const, startHour: 6, endHour: 11 },
  { id: "afternoon" as const, startHour: 12, endHour: 17 },
  { id: "evening" as const, startHour: 18, endHour: 23 },
] as const;

/** Returns rhythm label based on peak hour (0-23) */
export function getRhythmKey(hour: number): TemporalRhythmKey {
  if (hour >= 0 && hour <= 5) return "rhythmNightOwl";
  if (hour >= 6 && hour <= 11) return "rhythmMorningPerson";
  if (hour >= 12 && hour <= 17) return "rhythmAfternoon";
  return "rhythmEvening";
}

export function getDayPartId(hour: number): TemporalDayPartId {
  const rhythm = getRhythmKey(hour);
  if (rhythm === "rhythmNightOwl") return "night";
  if (rhythm === "rhythmMorningPerson") return "morning";
  if (rhythm === "rhythmAfternoon") return "afternoon";
  return "evening";
}

/** 24h clock: hour 0 = top, angle in degrees for SVG transform */
export function getClockHandAngle(hour: number): number {
  return (hour / 24) * 360 - 90;
}

/** Format hour for display: 12h AM/PM for English, 24h for others */
export function formatHourForDisplay(hour: number, locale: string): string {
  const date = new Date(2000, 0, 1, hour, 0, 0);
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    hour12: locale.startsWith("en"),
  });
}
