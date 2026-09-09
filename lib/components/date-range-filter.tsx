"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { DashboardUserMenu } from "@/lib/components/dashboard-user-menu";
import { DateRangeFilterMobile } from "@/lib/components/date-range-filter-mobile";
import { GenreBackfillGlobalBadge } from "@/lib/components/genre-backfill-global-badge";
import { NotificationCenter } from "@/lib/components/notification-center";
import {
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { DASHBOARD_DATE_RANGE_FILTER_ID } from "@/lib/constants/date-range-filter";
import { useHideNotificationCenterForPublicDemo } from "@/lib/hooks/use-public-demo-viewer";
import {
  FIXED_DATE_RANGE_PRESETS,
  getDateRangePresetFromSearchParams,
  useDashboardDateRange,
  type DateRangePreset,
} from "@/lib/hooks/use-dashboard-date-range";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";

export type { DateRangePreset };
export { getDateRangePresetFromSearchParams };

const DESKTOP_PRESETS: DateRangePreset[] = [...FIXED_DATE_RANGE_PRESETS, "custom"];

export function DateRangeFilter() {
  const t = useTranslations("components.dateRangeFilter");
  const locale = useLocale();
  const {
    currentPreset,
    searchParams,
    customStart,
    customEnd,
    setCustomStart,
    setCustomEnd,
    syncCustomFieldsFromUrl,
    updateDateRange,
    applyCustomRange,
  } = useDashboardDateRange();
  const hideNotificationCenter = useHideNotificationCenterForPublicDemo(
    searchParams.get("userId"),
  );

  const [customOpen, setCustomOpen] = useState(false);
  const customWrapRef = useRef<HTMLDivElement>(null);
  const customButtonRef = useRef<HTMLButtonElement>(null);
  const customStartInputRef = useRef<HTMLInputElement>(null);
  const buttonRefs = useRef<Partial<Record<DateRangePreset, HTMLButtonElement | null>>>({});
  const radiogroupLabelId = useId();

  useEffect(() => {
    if (!customOpen) return;
    syncCustomFieldsFromUrl();
  }, [customOpen, syncCustomFieldsFromUrl]);

  useEffect(() => {
    if (currentPreset !== "custom") {
      setCustomOpen(false);
    }
  }, [currentPreset]);

  useEffect(() => {
    if (!customOpen) return;
    customStartInputRef.current?.focus();
  }, [customOpen]);

  useEffect(() => {
    if (!customOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (customWrapRef.current && !customWrapRef.current.contains(event.target as Node)) {
        setCustomOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [customOpen]);

  useEffect(() => {
    if (!customOpen) return;
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCustomOpen(false);
      customButtonRef.current?.focus();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [customOpen]);

  const closeCustom = () => {
    setCustomOpen(false);
    customButtonRef.current?.focus();
  };

  const focusPreset = (preset: DateRangePreset) => {
    const node = preset === "custom" ? customButtonRef.current : buttonRefs.current[preset];
    node?.focus();
  };

  const onRadiogroupKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLButtonElement) || event.target.getAttribute("role") !== "radio") {
      return;
    }
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const fromIndex = DESKTOP_PRESETS.findIndex((preset) => {
      const node = preset === "custom" ? customButtonRef.current : buttonRefs.current[preset];
      return node === event.target;
    });
    const start = fromIndex >= 0 ? fromIndex : DESKTOP_PRESETS.indexOf(currentPreset);
    if (start < 0) return;

    event.preventDefault();

    let nextIndex = start;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (start + 1) % DESKTOP_PRESETS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (start - 1 + DESKTOP_PRESETS.length) % DESKTOP_PRESETS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else {
      nextIndex = DESKTOP_PRESETS.length - 1;
    }

    const next = DESKTOP_PRESETS[nextIndex];
    focusPreset(next);
    if (next === "custom") return;
    void updateDateRange(next);
  };

  const customRangeLabel =
    currentPreset === "custom"
      ? formatOverviewDateRangeLabel(
          searchParams.get("startDate") ?? undefined,
          searchParams.get("endDate") ?? undefined,
          locale,
        )
      : "";

  const headerActions = (
    <>
      {!hideNotificationCenter ? <GenreBackfillGlobalBadge /> : null}
      {!hideNotificationCenter ? <NotificationCenter /> : null}
      <DashboardUserMenu />
    </>
  );

  return (
    <div
      id={DASHBOARD_DATE_RANGE_FILTER_ID}
      className="transition-[box-shadow] duration-500 data-[highlighted]:ring-2 data-[highlighted]:ring-ring"
    >
      <div className="flex min-w-0 items-center gap-2.5 px-3 py-2 lg:hidden">
        <DateRangeFilterMobile
          currentPreset={currentPreset}
          startDate={searchParams.get("startDate")}
          endDate={searchParams.get("endDate")}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onSyncCustomFields={syncCustomFieldsFromUrl}
          onSelectPreset={(preset) => {
            void updateDateRange(preset);
          }}
          onApplyCustom={applyCustomRange}
        />
        <div className="flex shrink-0 items-center gap-2.5">{headerActions}</div>
      </div>

      <div className="hidden px-3 py-2 lg:block">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span id={radiogroupLabelId} className="sr-only">
            {t("period")}
          </span>
          <div
            role="radiogroup"
            aria-labelledby={radiogroupLabelId}
            onKeyDown={onRadiogroupKeyDown}
            className={`${DASHBOARD_SEGMENTED_TRACK} min-w-0 shrink`}
          >
            {FIXED_DATE_RANGE_PRESETS.map((key) => {
              const isActive = currentPreset === key;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    buttonRefs.current[key] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => {
                    void updateDateRange(key);
                  }}
                  title={t(`presetsFull.${key}`)}
                  aria-label={t(`presetsFull.${key}`)}
                  className={isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
                >
                  {t(`presets.${key}`)}
                </button>
              );
            })}
            <div ref={customWrapRef} className="relative">
              <button
                type="button"
                ref={customButtonRef}
                role="radio"
                aria-checked={currentPreset === "custom"}
                tabIndex={currentPreset === "custom" ? 0 : -1}
                onClick={() => setCustomOpen((value) => !value)}
                title={t("presetsFull.custom")}
                aria-label={t("presetsFull.custom")}
                aria-expanded={customOpen}
                aria-haspopup="dialog"
                className={
                  currentPreset === "custom" ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL
                }
              >
                {t("presets.custom")}
              </button>
              {customOpen ? (
                <div
                  role="dialog"
                  aria-label={t("customDialogLabel")}
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[18rem] rounded-[12px] border border-glass-hairline bg-surface-raised p-4"
                >
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                      {t("customStart")}
                      <input
                        ref={customStartInputRef}
                        type="date"
                        value={customStart}
                        onChange={(event) => setCustomStart(event.target.value)}
                        className="min-h-11 rounded-[12px] border border-glass-hairline bg-surface px-2 text-[13px] text-foreground"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted">
                      {t("customEnd")}
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        className="min-h-11 rounded-[12px] border border-glass-hairline bg-surface px-2 text-[13px] text-foreground"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={closeCustom}
                        className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-medium text-muted hover:text-foreground"
                      >
                        {t("customCancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (applyCustomRange()) closeCustom();
                        }}
                        className="inline-flex min-h-11 items-center rounded-full border border-glass-hairline bg-surface-raised px-3.5 text-[13px] font-semibold text-foreground hover:bg-surface"
                      >
                        {t("customApply")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {customRangeLabel ? (
            <span className="max-w-[14rem] shrink-0 truncate text-[13px] tabular-nums text-muted">
              {customRangeLabel}
            </span>
          ) : null}
          <div className="flex shrink-0 items-center gap-3">{headerActions}</div>
        </div>
      </div>
    </div>
  );
}
