"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { DashboardUserMenu } from "@/lib/components/dashboard-user-menu";
import { DateRangeFilterMobile } from "@/lib/components/date-range-filter-mobile";
import { NotificationCenter } from "@/lib/components/notification-center";
import { useMobileSidebar } from "@/lib/components/sidebar";
import { DASHBOARD_DATE_RANGE_FILTER_ID } from "@/lib/constants/date-range-filter";
import { useHideNotificationCenterForPublicDemo } from "@/lib/hooks/use-public-demo-viewer";
import {
  FIXED_DATE_RANGE_PRESETS,
  getDateRangePresetFromSearchParams,
  useDashboardDateRange,
  type DateRangePreset,
} from "@/lib/hooks/use-dashboard-date-range";

export type { DateRangePreset };
export { getDateRangePresetFromSearchParams };

export function DateRangeFilter() {
  const t = useTranslations("components.dateRangeFilter");
  const tSidebar = useTranslations("sidebar");
  const { toggle: toggleMobileSidebar } = useMobileSidebar();
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
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeButton = buttonRefs.current[currentPreset];
    if (activeButton && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [currentPreset]);

  useEffect(() => {
    const handleResize = () => {
      const activeButton = buttonRefs.current[currentPreset];
      if (activeButton && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentPreset]);

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
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCustomOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [customOpen]);

  const headerActions = (
    <>
      {!hideNotificationCenter ? <NotificationCenter /> : null}
      <DashboardUserMenu />
    </>
  );

  const hamburger = (
    <button
      type="button"
      onClick={toggleMobileSidebar}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-card-border bg-card-surface text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      aria-label={tSidebar("openMenu")}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );

  const presetButtonClass = (active: boolean) =>
    [
      "relative z-10 shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200",
      active ? "text-white" : "text-muted hover:text-foreground",
    ].join(" ");

  return (
    <div
      id={DASHBOARD_DATE_RANGE_FILTER_ID}
      className="transition-[box-shadow] duration-500 data-[highlighted]:shadow-[inset_0_0_0_2px_rgb(152_80_208_/_0.45)]"
    >
      <div className="flex min-w-0 items-center gap-2 px-3 py-2 lg:hidden">
        {hamburger}
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
        <div className="flex shrink-0 items-center gap-0.5">{headerActions}</div>
      </div>

      <div className="hidden px-8 py-3 lg:block">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t("period")}
          </span>
          <div
            ref={containerRef}
            className="relative flex min-w-0 flex-1 items-center rounded-xl border border-card-border bg-surface p-1"
          >
            {indicatorStyle ? (
              <div
                className="absolute top-1.5 h-[calc(100%-12px)] rounded-lg bg-brand-gradient shadow-sm transition-all duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />
            ) : null}
            {FIXED_DATE_RANGE_PRESETS.map((key) => {
              const isActive = currentPreset === key;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    buttonRefs.current[key] = el;
                  }}
                  type="button"
                  onClick={() => {
                    void updateDateRange(key);
                  }}
                  title={t(`presets.${key}`)}
                  className={presetButtonClass(isActive)}
                >
                  {t(`presets.${key}`)}
                </button>
              );
            })}
            <div ref={customWrapRef} className="relative z-10">
              <button
                type="button"
                ref={(el) => {
                  buttonRefs.current.custom = el;
                }}
                onClick={() => setCustomOpen((value) => !value)}
                title={t("presets.custom")}
                aria-expanded={customOpen}
                aria-haspopup="dialog"
                className={presetButtonClass(currentPreset === "custom")}
              >
                {t("presets.custom")}
              </button>
              {customOpen ? (
                <div
                  role="dialog"
                  aria-label={t("customDialogLabel")}
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[18rem] rounded-xl border border-card-border bg-surface-raised p-4 shadow-card"
                >
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                      {t("customStart")}
                      <input
                        type="date"
                        value={customStart}
                        onChange={(event) => setCustomStart(event.target.value)}
                        className="rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm text-foreground"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                      {t("customEnd")}
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(event) => setCustomEnd(event.target.value)}
                        className="rounded-lg border border-card-border bg-card px-2 py-1.5 text-sm text-foreground"
                      />
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCustomOpen(false)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-primary/10"
                      >
                        {t("customCancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (applyCustomRange()) setCustomOpen(false);
                        }}
                        className="rounded-lg bg-brand-gradient px-3 py-1.5 text-sm font-semibold text-white hover:opacity-95"
                      >
                        {t("customApply")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">{headerActions}</div>
        </div>
      </div>
    </div>
  );
}
