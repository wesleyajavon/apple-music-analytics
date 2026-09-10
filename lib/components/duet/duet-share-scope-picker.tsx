"use client";

import { useTranslations } from "next-intl";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
} from "@/lib/components/dashboard-ui";
import type { DuetShareScopeOption } from "@/lib/hooks/use-duet";

type DuetShareScopePickerProps = {
  groupName: string;
  value: DuetShareScopeOption;
  onChange: (scope: DuetShareScopeOption) => void;
  disabled?: boolean;
  /** When false, legend is omitted and aria-label uses the prompt. Default true. */
  showLegend?: boolean;
  /** Override legend / aria-label (defaults to inviteAccept.sharePrompt). */
  legend?: string;
};

export function DuetShareScopePicker({
  groupName,
  value,
  onChange,
  disabled = false,
  showLegend = true,
  legend,
}: DuetShareScopePickerProps) {
  const tAccept = useTranslations("duet.inviteAccept");
  const legendText = legend ?? tAccept("sharePrompt");

  const options = [
    {
      value: "aggregates" as const,
      label: tAccept("scopeAggregates.label"),
      description: tAccept("scopeAggregates.description"),
    },
    {
      value: "full" as const,
      label: tAccept("scopeFull.label"),
      description: tAccept("scopeFull.description"),
    },
  ];

  return (
    <fieldset
      disabled={disabled}
      className="w-full space-y-0"
      aria-label={showLegend ? undefined : legendText}
    >
      {showLegend ? (
        <legend className="mb-2 text-[13px] font-semibold text-foreground">{legendText}</legend>
      ) : null}
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} cursor-pointer ${
              disabled ? "cursor-not-allowed opacity-60" : ""
            } ${selected ? "text-foreground" : "text-muted"}`}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">{option.label}</span>
              <span className="mt-0.5 block text-[13px] leading-5 text-muted">{option.description}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
