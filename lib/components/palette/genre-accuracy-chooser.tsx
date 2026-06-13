"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Loader2, Palette, Sparkles } from "lucide-react";
import { useGroqGenreBackfillMeta } from "@/lib/hooks/use-groq-genre-backfill-meta";

type GenreAccuracyChooserProps = {
  viewerUserId?: string | null;
  variant?: "default" | "compact";
  className?: string;
};

const SHELL_CLASS =
  "relative overflow-hidden rounded-[1.5rem] border border-slate-200/85 bg-gradient-to-br from-white via-slate-50/90 to-white shadow-lg shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.04] backdrop-blur dark:border-white/[0.06] dark:from-[#0a0b10] dark:via-[#090a0f] dark:to-[#080913]";

const GROQ_CARD_CLASS =
  "relative flex h-full flex-col rounded-2xl border-2 border-violet-300/55 bg-gradient-to-br from-violet-50/95 via-white to-white p-4 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/10 dark:border-violet-400/35 dark:from-violet-950/35 dark:via-[#0f111a] dark:to-[#0c0e18] dark:shadow-violet-500/5";

const PALETTE_CARD_CLASS =
  "flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/88 p-4 shadow-sm ring-1 ring-slate-900/[0.03] dark:border-white/[0.06] dark:bg-[#0f111a]";

const GROQ_BUTTON_CLASS =
  "group mt-auto inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-all duration-300 hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60";

const PALETTE_BUTTON_CLASS =
  "mt-auto inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-violet-300/45 hover:bg-white hover:text-violet-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:border-violet-400/30 dark:hover:bg-white/[0.08]";

function ChooserBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_40%),radial-gradient(circle_at_92%_8%,rgba(6,182,212,0.07),transparent_34%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_38%),radial-gradient(circle_at_92%_8%,rgba(6,182,212,0.09),transparent_34%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/45 to-transparent dark:via-violet-400/28"
        aria-hidden
      />
    </>
  );
}

export function GenreAccuracyChooser({
  viewerUserId,
  variant = "default",
  className = "",
}: GenreAccuracyChooserProps) {
  const t = useTranslations("genreTrends");
  const tConsent = useTranslations("onboarding.genreLlmConsent");
  const { meta, isStarting, isJobActive, startBackfill } = useGroqGenreBackfillMeta(viewerUserId);

  if (viewerUserId != null) {
    return null;
  }

  const paddingClass = variant === "compact" ? "p-4" : "p-5 sm:p-6";

  if (!meta.loaded) {
    return (
      <div className={`${SHELL_CLASS} ${paddingClass} ${className}`} aria-busy="true">
        <ChooserBackground />
        <p className="relative text-sm text-slate-600 dark:text-slate-300">{t("groqCheckingEligibility")}</p>
      </div>
    );
  }

  if (meta.errorStatus === 401) {
    return (
      <div className={`${SHELL_CLASS} ${paddingClass} ${className}`}>
        <ChooserBackground />
        <p className="relative text-sm text-slate-600 dark:text-slate-300">{t("groqAuthUnavailable")}</p>
      </div>
    );
  }

  if (meta.errorStatus === 403) {
    return (
      <div className={`${SHELL_CLASS} ${paddingClass} ${className}`}>
        <ChooserBackground />
        <p className="relative text-sm text-slate-600 dark:text-slate-300">{t("groqRecentAuthRequired")}</p>
      </div>
    );
  }

  if (meta.errorStatus != null) {
    return (
      <div className={`${SHELL_CLASS} ${paddingClass} ${className}`}>
        <ChooserBackground />
        <p className="relative text-sm text-slate-600 dark:text-slate-300">
          {t("groqEligibilityRequestFailed", { status: meta.errorStatus })}
        </p>
      </div>
    );
  }

  if (!meta.eligibility) {
    return (
      <div className={`${SHELL_CLASS} ${paddingClass} ${className}`}>
        <ChooserBackground />
        <p className="relative text-sm text-slate-600 dark:text-slate-300">{t("groqEligibilityUnavailable")}</p>
      </div>
    );
  }

  if (meta.eligibility.unknownTrackCount === 0) {
    return null;
  }

  if (isJobActive) {
    return (
      <div className={`${SHELL_CLASS} ${paddingClass} ${className}`}>
        <ChooserBackground />
        <p className="relative text-sm leading-6 text-slate-700 dark:text-slate-200">
          <span>{t("groqSessionRunningHint")} </span>
          <a
            href="#genre-backfill-global-badge-panel"
            className="font-semibold text-violet-600 underline underline-offset-2 hover:text-violet-800 dark:text-violet-300 dark:hover:text-white"
          >
            {t("groqProgressAnchor")}
          </a>
        </p>
      </div>
    );
  }

  const groqConfigured = meta.eligibility.groqConfigured;
  const showPrivacy = variant !== "compact" && groqConfigured;

  return (
    <div className={`${SHELL_CLASS} ${paddingClass} ${className}`}>
      <ChooserBackground />
      <div className="relative space-y-4">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-slate-950 dark:text-white sm:text-lg">
            {t("genreAccuracyChooserTitle")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t("genreAccuracyChooserIntro")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={GROQ_CARD_CLASS}>
            <span className="mb-3 inline-flex w-fit items-center rounded-full border border-violet-300/50 bg-violet-100/90 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-violet-800 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-100">
              {t("genreAccuracyGroqRecommended")}
            </span>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-200/85 bg-violet-50/95 text-violet-700 shadow-sm dark:border-violet-400/30 dark:bg-violet-950/45 dark:text-violet-200">
                <Sparkles className="h-5 w-5" strokeWidth={1.7} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("genreAccuracyGroqTitle")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t("genreAccuracyGroqDescription")}
                </p>
              </div>
            </div>
            {!groqConfigured ? (
              <p className="mt-3 text-xs leading-5 text-amber-800 dark:text-amber-200">{tConsent("missingKey")}</p>
            ) : null}
            {showPrivacy ? (
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{tConsent("privacy")}</p>
            ) : null}
            <button
              type="button"
              disabled={!groqConfigured || isStarting}
              onClick={() =>
                void startBackfill(tConsent("startError"), tConsent("startedToast"))
              }
              className={`${GROQ_BUTTON_CLASS} ${showPrivacy || !groqConfigured ? "mt-3" : "mt-4"}`}
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>{tConsent("starting")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 opacity-90" aria-hidden />
                  <span>{tConsent("accept")}</span>
                </>
              )}
            </button>
          </div>

          <div className={PALETTE_CARD_CLASS}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200/85 bg-slate-50/95 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
                <Palette className="h-5 w-5" strokeWidth={1.7} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("genreAccuracyPaletteTitle")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t("genreAccuracyPaletteDescription")}
                </p>
              </div>
            </div>
            <Link href="/dashboard/genres/palette" className={`${PALETTE_BUTTON_CLASS} mt-4`}>
              <span>{t("genreAccuracyPaletteCta")}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
