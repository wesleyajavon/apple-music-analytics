"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

/** Shell héro cinématique partagé (overview, onboarding, musical-profile). */
export const DASHBOARD_CINEMATIC_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-accent-violet/30 bg-gray-950 text-white shadow-2xl shadow-accent-violet/25 ring-1 ring-accent-violet/15";

export function DashboardCinematicHeroBg() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,64,104,0.28),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(79,144,224,0.24),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 rounded-full bg-accent-violet/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden
      />
    </>
  );
}

/** Carte verre pour étapes onboarding et panneaux légers. */
export const DASHBOARD_GLASS_CARD_SHELL =
  "relative overflow-hidden rounded-3xl border border-card-border bg-surface-glass px-6 py-8 shadow-card backdrop-blur-xl sm:px-8 sm:py-10";

/** Carte widget pour sections de données (leaders, tendances). */
export const DASHBOARD_WIDGET_CARD_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-card to-surface shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06]";

export const DASHBOARD_BTN_GRADIENT =
  "group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0";

export const DASHBOARD_BTN_OUTLINE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-card-border bg-surface-raised px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/28 hover:bg-primary/[0.05] hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/12 dark:bg-white/[0.06] dark:hover:border-white/22 dark:hover:bg-white/[0.1]";

export const DASHBOARD_BTN_GHOST =
  "inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-55";

export const DASHBOARD_BTN_LINK =
  "inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-card-border bg-white/70 px-4 py-2.5 text-sm font-semibold shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:border-white/[0.10] dark:bg-[#161822] dark:hover:bg-[#1c2030]";

type DashboardButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  fullWidth?: boolean;
};

export const DashboardGradientButton = forwardRef<HTMLButtonElement, DashboardButtonProps>(
  function DashboardGradientButton(
    { className = "", isLoading, fullWidth = true, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`${DASHBOARD_BTN_GRADIENT} ${fullWidth ? "w-full sm:w-auto" : ""} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

export const DashboardOutlineButton = forwardRef<HTMLButtonElement, DashboardButtonProps>(
  function DashboardOutlineButton(
    { className = "", isLoading, fullWidth = true, children, disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`${DASHBOARD_BTN_OUTLINE} ${fullWidth ? "w-full sm:w-auto" : ""} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);

export function DashboardWidgetCardBg({ glowClass }: { glowClass?: string }) {
  return (
    <>
      {glowClass ? (
        <div
          className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl ${glowClass}`}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-80"
        aria-hidden
      />
    </>
  );
}

export function DashboardOnboardingProviderCard({
  onClick,
  logo,
  badge,
  title,
  hint,
  hoverAccentClass,
}: {
  onClick: () => void;
  logo: ReactNode;
  badge?: string;
  title: string;
  hint: string;
  hoverAccentClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.35rem] border border-card-border bg-card-surface/80 p-4 text-left shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${hoverAccentClass}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-brand-gradient-soft opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-surface-raised shadow-sm">
        {logo}
      </div>
      <div className="relative min-w-0 flex-1">
        {badge ? (
          <span className="mb-1 inline-flex rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-primary">
            {badge}
          </span>
        ) : null}
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </div>
      <svg
        className="relative h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
