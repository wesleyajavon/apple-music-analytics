"use client";

import { useTranslations } from "next-intl";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_GRADIENT,
  DASHBOARD_BTN_OUTLINE,
} from "@/lib/components/dashboard-ui";

export type OnboardingMobileStickyMode =
  | "welcome"
  | "pick"
  | "guide"
  | "import"
  | "finish";

type OnboardingMobileStickyActionsProps = {
  mode: OnboardingMobileStickyMode;
  onPrimary?: () => void;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  hidePrimary?: boolean;
  onBack?: () => void;
  hideBack?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
  isLoading?: boolean;
};

export function OnboardingMobileStickyActions({
  mode,
  onPrimary,
  primaryLabel,
  primaryDisabled = false,
  hidePrimary = false,
  onBack,
  hideBack = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  isLoading = false,
}: OnboardingMobileStickyActionsProps) {
  const t = useTranslations("onboarding");
  const showPrimary = !hidePrimary && Boolean(onPrimary && primaryLabel);
  const showBack = !hideBack && Boolean(onBack);
  const showSecondary = Boolean(secondaryLabel && onSecondary);
  const showSecondaryRow = showBack || showSecondary;

  if (!showPrimary && !showSecondaryRow) return null;

  const regionLabel =
    mode === "welcome"
      ? t("mobile.regionWelcome")
      : mode === "pick"
        ? t("mobile.regionPick")
        : mode === "guide"
          ? t("guidePhaseLabel")
          : mode === "import"
            ? t("import.spotifyTitle")
            : t("mobile.regionFinish");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label={regionLabel}
    >
      <div className="pointer-events-auto border-t border-card-border bg-surface-glass/95 px-4 py-3 shadow-[0_-12px_40px_rgb(0_0_0_/0.12)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
          {showPrimary ? (
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryDisabled || isLoading}
              className={`${DASHBOARD_BTN_GRADIENT} min-h-11 w-full rounded-xl`}
            >
              {isLoading ? (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
              ) : null}
              <span>{primaryLabel}</span>
            </button>
          ) : null}
          {showSecondaryRow ? (
            <div className="flex gap-2">
              {showBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isLoading}
                  className={`${DASHBOARD_BTN_OUTLINE} min-h-11 min-w-0 flex-1 rounded-xl`}
                >
                  {t("back")}
                </button>
              ) : null}
              {showSecondary ? (
                <button
                  type="button"
                  onClick={onSecondary}
                  disabled={secondaryDisabled || isLoading}
                  className={`${DASHBOARD_BTN_GHOST} min-h-11 min-w-0 flex-1 rounded-xl border border-dashed border-border`}
                >
                  {secondaryLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
