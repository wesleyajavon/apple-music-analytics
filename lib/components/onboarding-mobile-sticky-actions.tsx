"use client";

import { useTranslations } from "next-intl";

type OnboardingMobileStickyActionsProps = {
  mode: "guide" | "import";
  onBack: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  isLoading?: boolean;
};

export function OnboardingMobileStickyActions({
  mode,
  onBack,
  onPrimary,
  primaryLabel,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  isLoading = false,
}: OnboardingMobileStickyActionsProps) {
  const t = useTranslations("onboarding");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label={mode === "guide" ? t("guidePhaseLabel") : t("import.spotifyTitle")}
    >
      <div className="pointer-events-auto border-t border-card-border bg-surface-glass/95 px-4 py-3 shadow-[0_-8px_32px_rgb(0_0_0_/0.1)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled || isLoading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-brand-glow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span
                className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden
              />
            ) : null}
            <span>{primaryLabel}</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-card-border bg-surface-raised px-4 text-sm font-semibold text-foreground transition-colors hover:bg-primary/5 disabled:opacity-60"
            >
              {t("back")}
            </button>
            {secondaryLabel && onSecondary ? (
              <button
                type="button"
                onClick={onSecondary}
                disabled={secondaryDisabled || isLoading}
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border px-4 text-sm font-medium text-muted transition-colors hover:border-primary/35 hover:text-foreground disabled:opacity-60"
              >
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
