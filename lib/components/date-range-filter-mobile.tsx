"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import {
  FIXED_DATE_RANGE_PRESETS,
  type DateRangePreset,
  type FixedDateRangePreset,
} from "@/lib/hooks/use-dashboard-date-range";

type DateRangeFilterMobileProps = {
  currentPreset: DateRangePreset;
  startDate: string | null;
  endDate: string | null;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onSyncCustomFields: () => void;
  onSelectPreset: (preset: FixedDateRangePreset) => void;
  onApplyCustom: () => boolean;
};

export function DateRangeFilterMobile({
  currentPreset,
  startDate,
  endDate,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  onSyncCustomFields,
  onSelectPreset,
  onApplyCustom,
}: DateRangeFilterMobileProps) {
  const t = useTranslations("components.dateRangeFilter");
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(currentPreset === "custom");

  useEffect(() => {
    if (!open) return;
    onSyncCustomFields();
    setCustomExpanded(currentPreset === "custom");
  }, [open, currentPreset, onSyncCustomFields]);

  const chipLabel =
    currentPreset === "custom" && startDate && endDate
      ? `${startDate} → ${endDate}`
      : t(`mobile.chip.${currentPreset}`);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("mobile.openLabel", { period: chipLabel })}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-card-border bg-surface px-3 text-left text-sm font-semibold text-foreground"
      >
        <span className="truncate">{chipLabel}</span>
        <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
        </svg>
      </button>

      <MobileBottomSheet
        open={open}
        onClose={close}
        ariaLabelledBy={titleId}
        insetAboveBottomNav
        restoreFocusRef={triggerRef}
      >
        <div className="px-4 pb-3 pt-1">
          <h2 id={titleId} className="mb-3 text-base font-semibold tracking-tight text-foreground">
            {t("mobile.sheetTitle")}
          </h2>
          <ul className="flex flex-col gap-1">
            {FIXED_DATE_RANGE_PRESETS.map((preset) => {
              const selected = currentPreset === preset;
              return (
                <li key={preset}>
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      onSelectPreset(preset);
                      close();
                    }}
                    className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium ${
                      selected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-card-surface"
                    }`}
                  >
                    {t(`mobile.presets.${preset}`)}
                    {selected ? (
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                aria-current={currentPreset === "custom" ? "true" : undefined}
                aria-expanded={customExpanded}
                onClick={() => setCustomExpanded((value) => !value)}
                className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-medium ${
                  currentPreset === "custom"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-card-surface"
                }`}
              >
                {t("mobile.presets.custom")}
                <svg
                  className={`h-4 w-4 shrink-0 transition-transform ${customExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
                </svg>
              </button>
            </li>
          </ul>

          {customExpanded ? (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-card-border bg-card-surface p-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                {t("customStart")}
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => onCustomStartChange(event.target.value)}
                  className="min-h-11 rounded-lg border border-card-border bg-card px-2 text-base text-foreground"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
                {t("customEnd")}
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => onCustomEndChange(event.target.value)}
                  className="min-h-11 rounded-lg border border-card-border bg-card px-2 text-base text-foreground"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted hover:bg-primary/10"
                >
                  {t("customCancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onApplyCustom()) close();
                  }}
                  className="min-h-11 rounded-lg bg-brand-gradient px-3 text-sm font-semibold text-white hover:opacity-95"
                >
                  {t("customApply")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </MobileBottomSheet>
    </>
  );
}
