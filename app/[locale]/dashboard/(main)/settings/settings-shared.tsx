"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";

export const SETTINGS_INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-glass-hairline bg-surface-raised px-3 py-2.5 text-base text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

export const SETTINGS_PRIMARY_SAVE_CLASS =
  "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

export function SettingsSwitch({
  id,
  checked,
  onChange,
  disabled,
  size = "default",
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  size?: "default" | "touch";
  "aria-label": string;
}) {
  const isTouch = size === "touch";
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isTouch ? "h-11 w-16 items-center" : "h-7 w-12"
      } ${checked ? "bg-accent-emerald" : "bg-black/15 dark:bg-white/20"} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <span
        className={`pointer-events-none block rounded-full bg-white shadow transition-transform ${
          isTouch
            ? `h-9 w-9 ${checked ? "translate-x-6" : "translate-x-1"}`
            : `h-6 w-6 translate-y-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`
        }`}
      />
    </button>
  );
}

export function SettingsSectionHeader({
  id,
  title,
  lead,
  tone = "default",
  children,
}: {
  id?: string;
  title: string;
  lead: string;
  tone?: "default" | "danger";
  children?: ReactNode;
}) {
  const titleClass =
    tone === "danger" ? "text-red-700 dark:text-red-300" : "text-foreground";
  const leadClass =
    tone === "danger" ? "text-red-800/80 dark:text-red-200/80" : "text-muted";

  return (
    <header className="mb-5 border-b border-glass-hairline pb-4">
      <h2 id={id} className={`${DASHBOARD_SECTION_TITLE} ${titleClass}`}>
        {title}
      </h2>
      <p className={`mt-2 max-w-3xl text-[13px] leading-6 ${leadClass}`}>{lead}</p>
      {children}
    </header>
  );
}

export function SettingsToggleRow({
  title,
  hint,
  checked,
  onChange,
  disabled,
  saving,
  savingLabel,
  ariaLabel,
  id,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
  savingLabel?: string;
  ariaLabel: string;
  id?: string;
}) {
  return (
    <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between gap-4`}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saving && savingLabel ? <span className="text-xs text-muted">{savingLabel}</span> : null}
        <SettingsSwitch id={id} aria-label={ariaLabel} checked={checked} disabled={disabled} onChange={onChange} />
      </div>
    </div>
  );
}

export function SettingsDataCard({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <article className={`${DASHBOARD_LIST_SEPARATOR} py-4`}>
      <div className={`${DASHBOARD_LIST_ROW} items-start`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-muted" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

export function SettingsSubsection({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function DangerPhraseFields({
  expectedPhrase,
  phraseLoadError,
  phraseInput,
  onPhraseInputChange,
  inputId,
}: {
  expectedPhrase: string | null;
  phraseLoadError: string | null;
  phraseInput: string;
  onPhraseInputChange: (value: string) => void;
  inputId: string;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  if (phraseLoadError) {
    return (
      <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
        {phraseLoadError}
      </p>
    );
  }

  if (!expectedPhrase) {
    return <p className="text-sm text-muted">{tCommon("pleaseWait")}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">{t("phraseInstruction")}</p>
      <div className="border-y border-glass-hairline py-3 font-mono text-base font-semibold tracking-wide text-foreground">
        {expectedPhrase}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground" htmlFor={inputId}>
          {t("phraseLabel")}
        </label>
        <input
          id={inputId}
          type="text"
          name={inputId}
          autoComplete="off"
          spellCheck={false}
          value={phraseInput}
          onChange={(e) => onPhraseInputChange(e.target.value)}
          placeholder={t("phrasePlaceholder")}
          className={`${SETTINGS_INPUT_CLASS} font-mono`}
        />
        <p className="mt-2 text-xs text-muted">{t("phraseHint")}</p>
      </div>
    </div>
  );
}
