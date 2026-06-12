/** Parse une date ISO (YYYY-MM-DD) sans décalage de fuseau horaire. */
export function parseProfileDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** Nombre de jours calendaires inclus dans la plage [start, end]. */
export function getProfileDateSpanDays(startDate: string, endDate: string): number {
  const start = parseProfileDate(startDate);
  const end = parseProfileDate(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

export type ProfileDateRangeParts = {
  startDate: string;
  endDate: string;
  isSingleDay: boolean;
  startLabel: string;
  endLabel: string | null;
  compactLabel: string;
  fullLabel: string;
};

function formatDay(date: Date, locale: string, opts: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(locale, opts);
}

/**
 * Formate une plage avec raccourcis contextuels :
 * - même jour → une seule date
 * - même mois → « 3 – 28 mars 2025 »
 * - même année → « 15 janv. – 12 juin 2025 »
 * - années différentes → dates complètes
 */
export function getProfileDateRangeParts(
  startDate: string | undefined,
  endDate: string | undefined,
  locale: string,
  variant: "full" | "compact" = "full",
): ProfileDateRangeParts | null {
  if (!startDate || !endDate) return null;

  const start = parseProfileDate(startDate);
  const end = parseProfileDate(endDate);
  const isSingleDay = startDate === endDate;

  const monthShort = { month: "short" as const };
  const dayOnly = { day: "numeric" as const };
  const dayMonthShort = { day: "numeric" as const, month: "short" as const };
  const dayMonthYear = { day: "numeric" as const, month: "short" as const, year: "numeric" as const };
  const dayMonthYearLong = { day: "numeric" as const, month: "long" as const, year: "numeric" as const };

  if (isSingleDay) {
    const label =
      variant === "compact"
        ? formatDay(end, locale, dayMonthYear)
        : formatDay(end, locale, dayMonthYearLong);
    return {
      startDate,
      endDate,
      isSingleDay: true,
      startLabel: label,
      endLabel: null,
      compactLabel: label,
      fullLabel: label,
    };
  }

  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth) {
    const startDay = formatDay(start, locale, dayOnly);
    const endFull =
      variant === "compact"
        ? formatDay(end, locale, dayMonthYear)
        : formatDay(end, locale, dayMonthYearLong);
    const compactLabel = `${startDay}–${endFull}`;
    const fullLabel = `${startDay} – ${endFull}`;
    return {
      startDate,
      endDate,
      isSingleDay: false,
      startLabel: startDay,
      endLabel: endFull,
      compactLabel,
      fullLabel,
    };
  }

  if (sameYear) {
    const startLabel = formatDay(start, locale, dayMonthShort);
    const endLabel =
      variant === "compact"
        ? formatDay(end, locale, dayMonthYear)
        : formatDay(end, locale, dayMonthYearLong);
    const compactLabel = `${startLabel}–${formatDay(end, locale, dayMonthYear)}`;
    const fullLabel = `${startLabel} – ${endLabel}`;
    return {
      startDate,
      endDate,
      isSingleDay: false,
      startLabel,
      endLabel,
      compactLabel,
      fullLabel,
    };
  }

  const startLabel =
    variant === "compact"
      ? formatDay(start, locale, dayMonthYear)
      : formatDay(start, locale, dayMonthYearLong);
  const endLabel =
    variant === "compact"
      ? formatDay(end, locale, dayMonthYear)
      : formatDay(end, locale, dayMonthYearLong);
  const compactLabel = `${formatDay(start, locale, dayMonthYear)}–${formatDay(end, locale, dayMonthYear)}`;
  const fullLabel = `${startLabel} – ${endLabel}`;

  return {
    startDate,
    endDate,
    isSingleDay: false,
    startLabel,
    endLabel,
    compactLabel,
    fullLabel,
  };
}

export type ProfileDurationBucket = "days" | "months" | "years" | "yearsMonths";

export type ProfileDurationParts = {
  bucket: ProfileDurationBucket;
  days: number;
  months: number;
  years: number;
  remainderMonths: number;
};

export function getProfileDurationParts(startDate: string, endDate: string): ProfileDurationParts {
  const days = getProfileDateSpanDays(startDate, endDate);

  if (days < 60) {
    return { bucket: "days", days, months: 0, years: 0, remainderMonths: 0 };
  }

  if (days < 365) {
    return { bucket: "months", days, months: Math.max(1, Math.round(days / 30)), years: 0, remainderMonths: 0 };
  }

  const years = Math.floor(days / 365);
  const remainderMonths = Math.round((days % 365) / 30);

  if (remainderMonths >= 1) {
    return { bucket: "yearsMonths", days, months: 0, years, remainderMonths };
  }

  return { bucket: "years", days, months: 0, years: Math.max(1, years), remainderMonths: 0 };
}
