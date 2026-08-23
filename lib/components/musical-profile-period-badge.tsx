"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getDateRangePresetFromSearchParams,
  type DateRangePreset,
} from "@/lib/components/date-range-filter";
import {
  getProfileDateRangeParts,
  getProfileDurationParts,
} from "@/lib/utils/musical-profile-date-range";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  );
}

function ArrowSeparator({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function usePresetLabel(preset: DateRangePreset): string {
  const t = useTranslations("musical-profile.periodBadge");
  const presetLabel: Record<DateRangePreset, string> = {
    "7d": t("periodLast7Days"),
    "30d": t("periodLast30Days"),
    ytd: t("periodYearToDate"),
    all: t("periodAllTime"),
    custom: t("periodCustom"),
  };
  return presetLabel[preset];
}

function formatDurationLabel(
  startDate: string,
  endDate: string,
  t: ReturnType<typeof useTranslations<"musical-profile.periodBadge">>,
): string {
  const parts = getProfileDurationParts(startDate, endDate);

  switch (parts.bucket) {
    case "days":
      return t("days", { count: parts.days });
    case "months":
      return t("months", { count: parts.months });
    case "years":
      return t("years", { count: parts.years });
    case "yearsMonths":
      return t("yearsMonths", { years: parts.years, months: parts.remainderMonths });
    default:
      return t("days", { count: parts.days });
  }
}

export function MusicalProfilePeriodBadge({
  startDate,
  endDate,
  locale,
  variant = "desktop",
  className = "",
}: {
  startDate?: string;
  endDate?: string;
  locale: string;
  variant?: "desktop" | "mobile";
  className?: string;
}) {
  const t = useTranslations("musical-profile.periodBadge");
  const searchParams = useSearchParams();
  const preset = getDateRangePresetFromSearchParams(searchParams);

  const rangeParts = useMemo(
    () => getProfileDateRangeParts(startDate, endDate, locale, variant === "mobile" ? "numeric" : "full"),
    [startDate, endDate, locale, variant],
  );

  const presetLabel = usePresetLabel(preset);
  const durationLabel = useMemo(
    () => (startDate && endDate ? formatDurationLabel(startDate, endDate, t) : ""),
    [startDate, endDate, t],
  );

  if (!rangeParts) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/45 ${className}`}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {t("fallback")}
      </span>
    );
  }

  const ariaLabel = rangeParts.isSingleDay
    ? t("ariaLabelSingleDay", { date: rangeParts.fullLabel })
    : t("ariaLabel", {
        start: rangeParts.startLabel,
        end: rangeParts.endLabel ?? rangeParts.startLabel,
      });

  if (variant === "mobile") {
    return (
      <div
        className={`inline-flex min-w-0 max-w-full items-start gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-2 py-1.5 backdrop-blur-sm ${className}`}
        role="group"
        aria-label={ariaLabel}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-cyan-100">
          <CalendarIcon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 text-left">
          <span className="block text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-cyan-100/90">
            {presetLabel}
          </span>
          <span className="mt-0.5 block text-[11px] font-medium leading-snug tabular-nums text-white/75">
            {rangeParts.isSingleDay ? (
              <time dateTime={rangeParts.startDate} className="whitespace-nowrap">
                {rangeParts.compactLabel}
              </time>
            ) : (
              <>
                <time dateTime={rangeParts.startDate} className="whitespace-nowrap">
                  {rangeParts.startLabel}
                </time>
                <span className="mx-0.5 text-white/35" aria-hidden>
                  →
                </span>
                <time dateTime={rangeParts.endDate} className="whitespace-nowrap">
                  {rangeParts.endLabel}
                </time>
              </>
            )}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex max-w-full items-stretch overflow-hidden rounded-2xl border border-white/12 bg-white/[0.06] shadow-lg shadow-black/10 backdrop-blur-md ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      <div className="flex shrink-0 flex-col items-center justify-center border-r border-white/10 bg-white/[0.04] px-3.5 py-3 sm:px-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
          <CalendarIcon className="h-4 w-4" />
        </span>
        <span className="mt-2 hidden text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-white/40 sm:block">
          {t("label")}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3 sm:px-4">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-cyan-100/85">
          {presetLabel}
        </span>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold tracking-tight text-white tabular-nums">
          {rangeParts.isSingleDay ? (
            <time dateTime={rangeParts.startDate} className="whitespace-nowrap">
              {rangeParts.startLabel}
            </time>
          ) : (
            <>
              <time dateTime={rangeParts.startDate} className="whitespace-nowrap">
                {rangeParts.startLabel}
              </time>
              <ArrowSeparator className="h-3.5 w-3.5 shrink-0 text-white/35" />
              <time dateTime={rangeParts.endDate} className="whitespace-nowrap">
                {rangeParts.endLabel}
              </time>
            </>
          )}
        </div>

        <span className="mt-1 text-[0.68rem] font-medium text-white/45">{durationLabel}</span>
      </div>
    </div>
  );
}
