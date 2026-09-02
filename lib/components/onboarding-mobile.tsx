"use client";

import Image from "next/image";
import { useId, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import {
  OnboardingGenreLlmConsentCard,
  OnboardingGroqEnableCard,
} from "@/lib/components/onboarding-finish-invites";
import { OnboardingMobileStickyActions } from "@/lib/components/onboarding-mobile-sticky-actions";
import {
  CinematicFilmGrain,
  CinematicFloatingOrbs,
  CinematicLightSweep,
} from "@/lib/components/musical-profile-cinematic";
import type { OnboardingImportMode } from "@/lib/services/listening/onboarding-import-mode";

const SPOTIFY_LOGO_SRC = "/brand/providers/spotify-icon.svg";
const APPLE_MUSIC_LOGO_SRC = "/brand/providers/apple-music-icon.svg";

const MOBILE_BLEED =
  "-mx-4 -mt-4 flex min-h-[70dvh] flex-col lg:hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))]";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const GROUP_SHELL =
  "divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border bg-card-surface";
const ROW_CLASS =
  "flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-foreground";

export type OnboardingMobilePhase = "welcome" | "pick" | "guide" | "import" | "finish";
export type OnboardingMobileProvider = "spotify" | "apple";

export type OnboardingMobileImportProgress = {
  phase: "checking" | "reading" | "parsing" | "validating" | "uploading" | "finalizing";
  percent: number;
  processedRows?: number;
  totalRows?: number;
  batchIndex?: number;
  batchCount?: number;
  isDeterminate: boolean;
};

export type OnboardingMobileImportSummary = {
  imported: number;
  skippedDuplicates: number;
  skippedByCursor?: number;
  mode: OnboardingImportMode;
};

export type OnboardingMobileGenreLlm = {
  unknownTrackCount: number;
  unknownRatio: number;
  groqConfigured: boolean;
};

export type OnboardingMobileBackfill = {
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  artistsProcessed: number;
  artistsMapped: number;
  tracksUpdated: number;
  apiRequestsUsed: number;
  initialUnknownPct: number | null;
  currentUnknownPct: number | null;
  targetUnknownPct: number;
  errorMessage: string | null;
};

export type OnboardingMobilePaletteInvitation = {
  shouldInvite: boolean;
  unknownArtists: number;
};

export type OnboardingMobileProps = {
  phase: OnboardingMobilePhase;
  provider: OnboardingMobileProvider | null;
  flowProgressPercent: number;
  flowStepLabel: string;
  flowProgressAria: string;
  isSubmitting: boolean;
  onContinueWelcome: () => void;
  onSkipOnboarding: () => void;
  onBackToWelcome: () => void;
  onSelectProvider: (provider: OnboardingMobileProvider) => void;
  guideTitle: string;
  guideBody: string;
  guideImageSrc: string;
  guideImageAlt: string;
  guideImageSrc2?: string;
  guideImageAlt2?: string;
  guideIndex: number;
  guideTotal: number;
  privacyHref: string;
  privacyLabel: string;
  onGuideNext: () => void;
  onGuideBack: () => void;
  importFile: File | null;
  onImportFile: (file: File | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isImporting: boolean;
  importOverlayKind: "file" | "spotify_web";
  importProgress: OnboardingMobileImportProgress | null;
  importMode: OnboardingImportMode;
  onImportMode: (mode: OnboardingImportMode) => void;
  providerHasExistingData: boolean;
  providerLabel: string;
  importCursorDateLabel: string | null;
  listenCount: number;
  hasSpotifyWebConnection: boolean;
  importInlineError: string | null;
  appleArchiveUrl: string;
  onVerifySpotifyWeb: () => void;
  onSubmitImport: () => void;
  onSkipImport: () => void;
  onBackImport: () => void;
  importSummary: OnboardingMobileImportSummary | null;
  genreLlmAfterImport: OnboardingMobileGenreLlm | null;
  onDeclineGenreLlm: () => void;
  onStartGenreLlm: () => void;
  isStartingLlmBackfill: boolean;
  showGenreConsent: boolean;
  showGroqEnableInvite: boolean;
  isEnablingGroq: boolean;
  onEnableGroq: () => void;
  onDeclineGroqEnable: () => void;
  hasActiveGroqJobShared: boolean;
  effectiveBackfill: OnboardingMobileBackfill | null;
  hasBackfillInProgress: boolean;
  shouldOfferNextLlmSession: boolean;
  shouldOfferRetryLlmSession: boolean;
  backfillProgressRatio: number;
  paletteInvitation: OnboardingMobilePaletteInvitation | null;
  onGoToMusicalProfile: () => void;
  onGoToDashboard: () => void;
  onGoToPalette: () => void;
};

function ChevronIcon() {
  return <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />;
}

function MobileProgress({
  percent,
  stepLabel,
  ariaLabel,
  onDark,
}: {
  percent: number;
  stepLabel: string;
  ariaLabel: string;
  onDark?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
        <span className={onDark ? "text-white/70" : "text-muted"}>{stepLabel}</span>
        <span className={`tabular-nums ${onDark ? "text-white/55" : "text-muted"}`}>{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={`h-1.5 overflow-hidden rounded-full ${onDark ? "bg-white/15" : "bg-border"}`}
      >
        <div
          className="h-full rounded-full bg-brand-gradient shadow-glow transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function OnboardingMobile(props: OnboardingMobileProps) {
  const t = useTranslations("onboarding");
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  const [helpSheetOpen, setHelpSheetOpen] = useState(false);
  const [secondShotSheetOpen, setSecondShotSheetOpen] = useState(false);
  const modeTitleId = useId();
  const helpTitleId = useId();
  const secondShotTitleId = useId();

  const showGenreConsent = props.showGenreConsent;

  const finishHasExtras =
    showGenreConsent ||
    Boolean(props.effectiveBackfill) ||
    props.showGroqEnableInvite ||
    Boolean(props.paletteInvitation?.shouldInvite);

  const importSubmitLabel = props.isImporting
    ? t("import.importing")
    : props.providerHasExistingData
      ? props.importMode === "incremental"
        ? t("import.importSubmitIncremental")
        : t("import.importSubmitFull")
      : t("import.importSubmitFirst");

  return (
    <div className={MOBILE_BLEED}>
      {props.phase === "welcome" ? (
        <>
          <section className={HERO_SHELL}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(240,64,104,0.32),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(6,182,212,0.22),transparent_34%),linear-gradient(165deg,rgba(3,7,18,0.98),rgba(30,27,75,0.92)_55%,rgba(8,47,73,0.78))]" />
            <CinematicFloatingOrbs />
            <CinematicFilmGrain />
            <CinematicLightSweep />
            <div className="relative space-y-4">
              <MobileProgress
                percent={props.flowProgressPercent}
                stepLabel={props.flowStepLabel}
                ariaLabel={props.flowProgressAria}
                onDark
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
                {t("welcomeEyebrow")}
              </p>
              <h1 className="text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
                {t("welcomeTitle")}
              </h1>
              <p className="text-sm leading-5 text-white/70">{t("welcomeBody")}</p>
            </div>
          </section>
          <OnboardingMobileStickyActions
            mode="welcome"
            hideBack
            onPrimary={props.onContinueWelcome}
            primaryLabel={t("continue")}
            secondaryLabel={t("skipForNow")}
            onSecondary={props.onSkipOnboarding}
            secondaryDisabled={props.isSubmitting}
            isLoading={props.isSubmitting}
          />
        </>
      ) : null}

      {props.phase === "pick" ? (
        <>
          <section className={HERO_SHELL}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(240,64,104,0.28),transparent_36%),linear-gradient(165deg,rgba(3,7,18,0.98),rgba(30,27,75,0.9)_60%,rgba(8,47,73,0.8))]" />
            <CinematicFilmGrain />
            <div className="relative space-y-3">
              <MobileProgress
                percent={props.flowProgressPercent}
                stepLabel={props.flowStepLabel}
                ariaLabel={props.flowProgressAria}
                onDark
              />
              <h1 className="text-[1.45rem] font-semibold leading-[1.12] tracking-[-0.04em]">
                {t("pickTitle")}
              </h1>
              <p className="text-sm leading-5 text-white/70">{t("pickSubtitle")}</p>
            </div>
          </section>
          <div className="space-y-3 px-4 pt-4">
            <div className={GROUP_SHELL}>
              <button type="button" className={ROW_CLASS} onClick={() => props.onSelectProvider("spotify")}>
                <Image src={SPOTIFY_LOGO_SRC} alt="" width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                <span className="min-w-0 flex-1">
                  <span className="block">{t("pickSpotify")}</span>
                  <span className="block text-xs font-normal text-muted">{t("pickSpotifyHint")}</span>
                </span>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t("pickBadgeSpotify")}
                </span>
                <ChevronIcon />
              </button>
              <button type="button" className={ROW_CLASS} onClick={() => props.onSelectProvider("apple")}>
                <Image
                  src={APPLE_MUSIC_LOGO_SRC}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  unoptimized
                />
                <span className="min-w-0 flex-1">
                  <span className="block">{t("pickApple")}</span>
                  <span className="block text-xs font-normal text-muted">{t("pickAppleHint")}</span>
                </span>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t("pickBadgeApple")}
                </span>
                <ChevronIcon />
              </button>
            </div>
          </div>
          <OnboardingMobileStickyActions
            mode="pick"
            hidePrimary
            onBack={props.onBackToWelcome}
            secondaryLabel={t("skipForNow")}
            onSecondary={props.onSkipOnboarding}
            secondaryDisabled={props.isSubmitting}
            isLoading={props.isSubmitting}
          />
        </>
      ) : null}

      {props.phase === "guide" && props.provider ? (
        <>
          <section className="relative overflow-hidden bg-gray-950 text-white">
            <figure className="relative overflow-hidden">
              <Image
                src={props.guideImageSrc}
                alt={props.guideImageAlt}
                width={1280}
                height={720}
                className="h-[40dvh] w-full object-contain object-top"
                sizes="100vw"
                priority={props.guideIndex === 0}
              />
            </figure>
          </section>
          <div className="space-y-4 px-4 pt-4">
            <MobileProgress
              percent={props.flowProgressPercent}
              stepLabel={props.flowStepLabel}
              ariaLabel={props.flowProgressAria}
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t("guideStepCounterLabel", { current: props.guideIndex + 1, total: props.guideTotal })}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{props.guideTitle}</h1>
            <p className="line-clamp-3 text-sm leading-5 text-muted">{props.guideBody}</p>
            <div className={GROUP_SHELL}>
              <a
                href={props.privacyHref}
                target="_blank"
                rel="noopener noreferrer"
                className={ROW_CLASS}
                aria-label={`${props.privacyLabel} (${t("externalLinkAria")})`}
              >
                <span className="flex-1">{props.privacyLabel}</span>
                <ChevronIcon />
              </a>
              {props.guideImageSrc2 && props.guideImageAlt2 ? (
                <button type="button" className={ROW_CLASS} onClick={() => setSecondShotSheetOpen(true)}>
                  <span className="flex-1">{t("mobile.extraScreenshotRow")}</span>
                  <ChevronIcon />
                </button>
              ) : null}
            </div>
          </div>
          <OnboardingMobileStickyActions
            mode="guide"
            onBack={props.onGuideBack}
            onPrimary={props.onGuideNext}
            primaryLabel={t("next")}
          />
          {props.guideImageSrc2 && props.guideImageAlt2 ? (
            <MobileBottomSheet
              open={secondShotSheetOpen}
              onClose={() => setSecondShotSheetOpen(false)}
              ariaLabelledBy={secondShotTitleId}
            >
              <div className="space-y-3 px-4 pb-6 pt-2">
                <h2 id={secondShotTitleId} className="text-base font-semibold text-foreground">
                  {t("mobile.extraScreenshotTitle")}
                </h2>
                <Image
                  src={props.guideImageSrc2}
                  alt={props.guideImageAlt2}
                  width={1280}
                  height={720}
                  className="h-auto w-full rounded-xl object-contain"
                  sizes="100vw"
                  unoptimized
                />
              </div>
            </MobileBottomSheet>
          ) : null}
        </>
      ) : null}

      {props.phase === "import" && props.provider ? (
        <>
          {props.isImporting ? (
            <section
              className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <div className="absolute inset-2 animate-spin rounded-full border-4 border-border border-t-primary" aria-hidden />
                <span className="text-sm font-bold tabular-nums text-primary">
                  {props.importProgress?.isDeterminate ? `${Math.round(props.importProgress.percent)}%` : "…"}
                </span>
              </div>
              <h1 className="text-lg font-semibold text-foreground">
                {props.importOverlayKind === "spotify_web"
                  ? t("import.importingOverlayTitleWebApi")
                  : t("import.importingOverlayTitle")}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-muted">
                {props.importProgress
                  ? t(`import.progressPhase.${props.importProgress.phase}`)
                  : props.importOverlayKind === "spotify_web"
                    ? t("import.importingOverlayHintWebApi")
                    : t("import.importingOverlayHint")}
              </p>
              {props.importFile && props.importOverlayKind === "file" ? (
                <p className="max-w-full truncate text-xs font-medium text-primary">{props.importFile.name}</p>
              ) : null}
            </section>
          ) : (
            <>
              <section className={HERO_SHELL}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(6,182,212,0.2),transparent_40%),linear-gradient(165deg,rgba(3,7,18,0.98),rgba(15,23,42,0.92))]" />
                <div className="relative space-y-3">
                  <MobileProgress
                    percent={props.flowProgressPercent}
                    stepLabel={props.flowStepLabel}
                    ariaLabel={props.flowProgressAria}
                    onDark
                  />
                  <h1 className="text-[1.35rem] font-semibold leading-[1.15] tracking-[-0.04em]">
                    {props.provider === "spotify" ? t("import.spotifyTitle") : t("import.appleTitle")}
                  </h1>
                  <p className="text-sm leading-5 text-white/70">
                    {props.providerHasExistingData
                      ? t("import.outcomeExistingKept", { count: props.listenCount.toLocaleString() })
                      : t("import.outcomeFirstImportTitle", { provider: props.providerLabel })}
                  </p>
                </div>
              </section>
              <div className="space-y-3 px-4 pt-4">
                {props.importInlineError ? (
                  <p
                    className="rounded-xl border border-accent-rose/40 bg-accent-rose/10 px-3.5 py-3 text-sm leading-5 text-foreground"
                    role="alert"
                  >
                    {props.importInlineError}
                  </p>
                ) : null}
                <input
                  ref={props.fileInputRef as RefObject<HTMLInputElement>}
                  type="file"
                  className="sr-only"
                  accept={props.provider === "spotify" ? ".zip,application/zip" : ".csv,text/csv"}
                  onChange={(e) => props.onImportFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-card-border bg-muted/5 px-4 py-5 text-center"
                  onClick={() => props.fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-6 w-6 text-muted" strokeWidth={1.75} aria-hidden />
                  <span className="text-sm font-medium text-foreground">{t("mobile.chooseFile")}</span>
                  <span className="text-xs text-muted">
                    {props.provider === "spotify" ? t("import.dropSubSpotify") : t("import.dropSubApple")}
                  </span>
                  {props.importFile ? (
                    <span className="mt-1 text-xs font-medium text-primary">
                      {t("import.selectedFile", { name: props.importFile.name })}
                    </span>
                  ) : null}
                </button>
                <div className={GROUP_SHELL}>
                  {props.providerHasExistingData ? (
                    <button type="button" className={ROW_CLASS} onClick={() => setModeSheetOpen(true)}>
                      <span className="min-w-0 flex-1">
                        <span className="block">{t("mobile.modeRow")}</span>
                        <span className="block text-xs font-normal text-muted">
                          {props.importMode === "incremental"
                            ? t("mobile.modeHintIncremental")
                            : t("mobile.modeHintFull")}
                        </span>
                      </span>
                      <ChevronIcon />
                    </button>
                  ) : null}
                  {props.provider === "spotify" && props.hasSpotifyWebConnection ? (
                    <button
                      type="button"
                      className={ROW_CLASS}
                      onClick={props.onVerifySpotifyWeb}
                      disabled={props.isImporting}
                    >
                      <span className="min-w-0 flex-1">{t("mobile.spotifyWebRow")}</span>
                      <ChevronIcon />
                    </button>
                  ) : null}
                  <button type="button" className={ROW_CLASS} onClick={() => setHelpSheetOpen(true)}>
                    <span className="flex-1">{t("mobile.fileHelpRow")}</span>
                    <ChevronIcon />
                  </button>
                  {props.provider === "apple" ? (
                    <a
                      href={props.appleArchiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={ROW_CLASS}
                      aria-label={`${t("import.openAppleDownloads")} (${t("externalLinkAria")})`}
                    >
                      <span className="flex-1">{t("import.openAppleDownloads")}</span>
                      <ChevronIcon />
                    </a>
                  ) : null}
                </div>
              </div>
            </>
          )}
          <OnboardingMobileStickyActions
            mode="import"
            onBack={props.onBackImport}
            onPrimary={props.onSubmitImport}
            primaryLabel={importSubmitLabel}
            primaryDisabled={props.isImporting || !props.importFile}
            secondaryLabel={t("import.skipImport")}
            onSecondary={props.onSkipImport}
            secondaryDisabled={props.isImporting}
            isLoading={props.isImporting}
          />
          <MobileBottomSheet open={modeSheetOpen} onClose={() => setModeSheetOpen(false)} ariaLabelledBy={modeTitleId}>
            <fieldset className="space-y-3 px-4 pb-6 pt-2">
              <legend id={modeTitleId} className="text-base font-semibold text-foreground">
                {t("import.modeTitle")}
              </legend>
              <p className="text-xs leading-relaxed text-muted">{t("import.modeIntro")}</p>
              <label className="flex min-h-11 cursor-pointer gap-3 rounded-xl border border-card-border bg-surface p-3 has-[:checked]:border-primary/40">
                <input
                  type="radio"
                  name="onboarding-mobile-import-mode"
                  className="mt-1"
                  checked={props.importMode === "incremental"}
                  onChange={() => {
                    props.onImportMode("incremental");
                    setModeSheetOpen(false);
                  }}
                />
                <span className="space-y-1 text-sm">
                  <span className="block font-medium">{t("import.modeIncremental")}</span>
                  <span className="block text-xs text-muted">
                    {props.importCursorDateLabel
                      ? t("import.modeIncrementalHint", {
                          date: props.importCursorDateLabel,
                          count: props.listenCount.toLocaleString(),
                        })
                      : t("import.modeIncrementalHintGeneric")}
                  </span>
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer gap-3 rounded-xl border border-card-border bg-surface p-3 has-[:checked]:border-primary/40">
                <input
                  type="radio"
                  name="onboarding-mobile-import-mode"
                  className="mt-1"
                  checked={props.importMode === "full"}
                  onChange={() => {
                    props.onImportMode("full");
                    setModeSheetOpen(false);
                  }}
                />
                <span className="space-y-1 text-sm">
                  <span className="block font-medium">{t("import.modeFull")}</span>
                  <span className="block text-xs text-muted">{t("import.modeFullHint")}</span>
                </span>
              </label>
            </fieldset>
          </MobileBottomSheet>
          <MobileBottomSheet open={helpSheetOpen} onClose={() => setHelpSheetOpen(false)} ariaLabelledBy={helpTitleId}>
            <div className="space-y-3 px-4 pb-6 pt-2">
              <h2 id={helpTitleId} className="text-base font-semibold text-foreground">
                {t("mobile.fileHelpRow")}
              </h2>
              {props.provider === "spotify" ? (
                <>
                  <Image
                    src="/onboarding/spotify-email-download.png"
                    alt={t("imageAltSpotifyEmail")}
                    width={1280}
                    height={720}
                    className="h-auto w-full rounded-xl object-contain"
                    sizes="100vw"
                  />
                  <Image
                    src="/onboarding/spotify-download-zip-file.png"
                    alt={t("imageAltSpotifyDownloadZip")}
                    width={1280}
                    height={720}
                    className="h-auto w-full rounded-xl object-contain"
                    sizes="100vw"
                  />
                </>
              ) : (
                <p className="text-sm leading-relaxed text-muted">{t("import.appleBody")}</p>
              )}
            </div>
          </MobileBottomSheet>
        </>
      ) : null}

      {props.phase === "finish" ? (
        <>
          {props.importSummary ? (
            <section className={HERO_SHELL}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.28),transparent_40%),linear-gradient(165deg,rgba(3,7,18,0.98),rgba(6,78,59,0.55))]" />
              <CinematicFilmGrain />
              <div className="relative space-y-4">
                <MobileProgress
                  percent={props.flowProgressPercent}
                  stepLabel={props.flowStepLabel}
                  ariaLabel={props.flowProgressAria}
                  onDark
                />
                <CheckCircle2 className="h-8 w-8 text-accent-emerald" strokeWidth={1.8} aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-emerald">
                  {t("finishSuccessEyebrow")}
                </p>
                <h1 className="text-[1.45rem] font-semibold leading-[1.12] tracking-[-0.04em]">
                  {t("finishSuccessTitle")}
                </h1>
                <p className="text-2xl font-semibold tabular-nums text-white">
                  {props.importSummary.imported.toLocaleString()}
                </p>
                <p className="text-sm leading-5 text-white/70">
                  {props.importSummary.mode === "incremental"
                    ? t("finishSuccessBodyAppend", {
                        imported: props.importSummary.imported.toLocaleString(),
                        skipped: props.importSummary.skippedDuplicates.toLocaleString(),
                      })
                    : t("finishSuccessBody", {
                        imported: props.importSummary.imported.toLocaleString(),
                        skipped: props.importSummary.skippedDuplicates.toLocaleString(),
                      })}
                </p>
              </div>
            </section>
          ) : (
            <section className={HERO_SHELL}>
              <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88))]" />
              <div className="relative space-y-3">
                <MobileProgress
                  percent={props.flowProgressPercent}
                  stepLabel={props.flowStepLabel}
                  ariaLabel={props.flowProgressAria}
                  onDark
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
                  {t("finishSkippedEyebrow")}
                </p>
                <h1 className="text-[1.45rem] font-semibold leading-[1.12]">{t("finishTitle")}</h1>
                <p className="text-sm leading-5 text-white/70">{t("finishBody")}</p>
              </div>
            </section>
          )}
          {finishHasExtras ? (
              <div className="space-y-3 px-4 pt-4">
                {showGenreConsent && props.genreLlmAfterImport ? (
                  <OnboardingGenreLlmConsentCard
                    unknownTrackCount={props.genreLlmAfterImport.unknownTrackCount}
                    unknownRatio={props.genreLlmAfterImport.unknownRatio}
                    groqConfigured={props.genreLlmAfterImport.groqConfigured}
                    isStarting={props.isStartingLlmBackfill}
                    hasActiveGroqJob={props.hasActiveGroqJobShared}
                    onAccept={props.onStartGenreLlm}
                    onDecline={props.onDeclineGenreLlm}
                  />
                ) : null}
                {props.effectiveBackfill ? (
                  <div className="space-y-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-4">
                    <p className="text-sm font-semibold text-foreground">{t("genreBackfill.title")}</p>
                    <p className="text-xs text-muted">
                      {props.hasBackfillInProgress
                        ? props.effectiveBackfill.status === "paused"
                          ? t("genreBackfill.paused")
                          : t("genreBackfill.running")
                        : props.effectiveBackfill.status === "completed"
                          ? t("genreBackfill.completed")
                          : props.effectiveBackfill.status === "cancelled"
                            ? t("genreBackfill.cancelled")
                            : t("genreBackfill.failed")}
                    </p>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/25">
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${Math.round(props.backfillProgressRatio * 100)}%` }}
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory">
                      {[
                        t("genreBackfill.artistsProcessed", { count: props.effectiveBackfill.artistsProcessed }),
                        t("genreBackfill.artistsMapped", { count: props.effectiveBackfill.artistsMapped }),
                        t("genreBackfill.tracksUpdated", { count: props.effectiveBackfill.tracksUpdated }),
                      ].map((label) => (
                        <p
                          key={label}
                          className="snap-start shrink-0 rounded-xl border border-card-border px-3 py-2 text-xs font-medium text-foreground"
                        >
                          {label}
                        </p>
                      ))}
                    </div>
                    {props.effectiveBackfill.errorMessage ? (
                      <p className="rounded-xl border border-accent-rose/40 bg-accent-rose/10 px-3 py-2 text-xs" role="alert">
                        {t("genreBackfill.error", { message: props.effectiveBackfill.errorMessage })}
                      </p>
                    ) : null}
                    {props.shouldOfferNextLlmSession || props.shouldOfferRetryLlmSession ? (
                      <button
                        type="button"
                        className={`${ROW_CLASS} rounded-xl border border-card-border`}
                        disabled={props.isStartingLlmBackfill || props.hasActiveGroqJobShared}
                        onClick={props.onStartGenreLlm}
                      >
                        {props.isStartingLlmBackfill ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="h-4 w-4" aria-hidden />
                        )}
                        <span className="flex-1">{t("genreLlmConsent.startNextSession")}</span>
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {props.showGroqEnableInvite ? (
                  <OnboardingGroqEnableCard
                    isEnabling={props.isEnablingGroq}
                    onAccept={props.onEnableGroq}
                    onDecline={props.onDeclineGroqEnable}
                  />
                ) : null}
                {props.paletteInvitation?.shouldInvite ? (
                  <button
                    type="button"
                    className={`${GROUP_SHELL} ${ROW_CLASS}`}
                    onClick={props.onGoToPalette}
                    disabled={props.isSubmitting}
                  >
                    <span className="flex-1">
                      {t("finishPaletteCta", { count: props.paletteInvitation.unknownArtists })}
                    </span>
                    <ChevronIcon />
                  </button>
                ) : null}
              </div>
          ) : null}
          <OnboardingMobileStickyActions
            mode="finish"
            hideBack
            onPrimary={props.importSummary ? props.onGoToMusicalProfile : props.onGoToDashboard}
            primaryLabel={
              props.isSubmitting
                ? t("finishing")
                : props.importSummary
                  ? t("goToMusicalProfile")
                  : t("goToDashboard")
            }
            primaryDisabled={props.isSubmitting}
            isLoading={props.isSubmitting}
          />
        </>
      ) : null}
    </div>
  );
}
