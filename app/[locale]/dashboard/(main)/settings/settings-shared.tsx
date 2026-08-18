"use client";

import type { ReactNode } from "react";
import { DASHBOARD_SPOTLIGHT_MUTED } from "@/lib/constants/dashboard-spotlight";

export const SETTINGS_INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/15 sm:text-sm dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500";

export const SETTINGS_PRIMARY_SAVE_CLASS =
  "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:bg-white dark:text-slate-950 dark:shadow-black/25 dark:hover:bg-slate-100 sm:w-auto";

export function SettingsSwitch({
  id,
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
        checked ? "bg-accent-emerald" : "bg-white/20"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`pointer-events-none block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
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
    tone === "danger"
      ? "text-red-950 dark:text-red-200"
      : "text-slate-900 dark:text-white";
  const leadClass =
    tone === "danger"
      ? "text-red-900/85 dark:text-red-200/85"
      : DASHBOARD_SPOTLIGHT_MUTED;

  return (
    <header className="mb-5">
      <h2 id={id} className={`text-xl font-semibold tracking-[-0.03em] ${titleClass}`}>
        {title}
      </h2>
      <p className={`mt-1.5 max-w-3xl text-sm leading-relaxed ${leadClass}`}>{lead}</p>
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
    <div className="flex min-h-[60px] items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 dark:border-white/10 dark:bg-black/20">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        {hint ? <p className={`mt-1 text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saving && savingLabel ? (
          <span className={`text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{savingLabel}</span>
        ) : null}
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
    <article className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950 sm:p-6">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-white/10">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{body}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
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
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {hint ? <p className={`mt-1 text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
