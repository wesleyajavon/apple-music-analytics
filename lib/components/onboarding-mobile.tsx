"use client";

import Image from "next/image";
import { useId, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronRight, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import {
  GenreAiPanelChrome,
  ONBOARDING_GENRE_AI_ACCEPT_BTN,
  OnboardingGenreLlmConsentCard,
  OnboardingGroqEnableCard,
} from "@/lib/components/onboarding-finish-invites";
import { OnboardingMobileStickyActions } from "@/lib/components/onboarding-mobile-sticky-actions";
import { OverviewMobileHero } from "@/lib/components/overview-hero";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_ROW_INTERACTIVE,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SECTION_EYEBROW,
} from "@/lib/components/dashboard-ui";
import type { OnboardingImportMode } from "@/lib/services/listening/onboarding-import-mode";

const SPOTIFY_LOGO_SRC = "/brand/providers/spotify-icon.svg";
const APPLE_MUSIC_LOGO_SRC = "/brand/providers/apple-music-icon.svg";

const MOBILE_BLEED =
  "-mx-4 -mt-4 flex min-h-[70dvh] flex-col lg:hidden pb-[calc(8.5rem+env(safe-area-inset-bottom))]";

const LIST_ROW = `${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_ROW_INTERACTIVE} ${DASHBOARD_LIST_SEPARATOR} min-h-11 w-full text-foreground`;

const GUIDE_FIGURE =
  "overflow-hidden rounded-2xl border border-glass-hairline bg-muted/10";

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
}: {
  percent: number;
  stepLabel: string;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className={DASHBOARD_SECTION_EYEBROW}>{stepLabel}</span>
        <span className="text-[13px] tabular-nums text-muted">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className="h-1.5 overflow-hidden rounded-full bg-border dark:bg-foreground/[0.08]"
      >
        <div
          className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out"
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
          <div className="space-y-6 px-4 pt-4">
            <MobileProgress
              percent={props.flowProgressPercent}
              stepLabel={props.flowStepLabel}
              ariaLabel={props.flowProgressAria}
            />
            <p className={DASHBOARD_SECTION_EYEBROW}>{t("welcomeEyebrow")}</p>
            <OverviewMobileHero title={t("welcomeTitle")} description={t("welcomeBody")} />
          </div>
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
          <div className="space-y-6 px-4 pt-4">
            <MobileProgress
              percent={props.flowProgressPercent}
              stepLabel={props.flowStepLabel}
              ariaLabel={props.flowProgressAria}
            />
            <OverviewMobileHero title={t("pickTitle")} description={t("pickSubtitle")} />
            <p className={DASHBOARD_SECTION_EYEBROW}>{t("flowRail.choose")}</p>
            <ul className="space-y-0">
              <li>
                <button
                  type="button"
                  className={LIST_ROW}
                  onClick={() => props.onSelectProvider("spotify")}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface">
                    <Image
                      src={SPOTIFY_LOGO_SRC}
                      alt=""
                      width={40}
                      height={40}
                      className="h-8 w-8 object-contain"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">
                      {t("pickSpotify")}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">{t("pickSpotifyHint")}</span>
                  </span>
                  <ChevronIcon />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={LIST_ROW}
                  onClick={() => props.onSelectProvider("apple")}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface">
                    <Image
                      src={APPLE_MUSIC_LOGO_SRC}
                      alt=""
                      width={40}
                      height={40}
                      className="h-8 w-8 object-contain"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">
                      {t("pickApple")}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">{t("pickAppleHint")}</span>
                  </span>
                  <ChevronIcon />
                </button>
              </li>
            </ul>
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
          <div className="space-y-4 px-4 pt-4">
            <MobileProgress
              percent={props.flowProgressPercent}
              stepLabel={props.flowStepLabel}
              ariaLabel={props.flowProgressAria}
            />
            <div className="flex items-center justify-between gap-3">
              <p className={DASHBOARD_SECTION_EYEBROW}>{t("guidePhaseLabel")}</p>
              <span className="text-[13px] tabular-nums text-muted" aria-live="polite">
                {t("guideStepCounterLabel", {
                  current: props.guideIndex + 1,
                  total: props.guideTotal,
                })}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {props.guideTitle}
            </h1>
            <p className="text-sm leading-relaxed text-muted">{props.guideBody}</p>
            <figure className={GUIDE_FIGURE}>
              <Image
                src={props.guideImageSrc}
                alt={props.guideImageAlt}
                width={1280}
                height={720}
                className="h-auto w-full object-contain"
                sizes="100vw"
                priority={props.guideIndex === 0}
              />
            </figure>
            <div className="space-y-0">
              <a
                href={props.privacyHref}
                target="_blank"
                rel="noopener noreferrer"
                className={LIST_ROW}
                aria-label={`${props.privacyLabel} (${t("externalLinkAria")})`}
              >
                <span className="min-w-0 flex-1 text-sm font-medium">{props.privacyLabel}</span>
                <ChevronIcon />
              </a>
              {props.guideImageSrc2 && props.guideImageAlt2 ? (
                <button
                  type="button"
                  className={LIST_ROW}
                  onClick={() => setSecondShotSheetOpen(true)}
                >
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {t("mobile.extraScreenshotRow")}
                  </span>
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
                <figure className={GUIDE_FIGURE}>
                  <Image
                    src={props.guideImageSrc2}
                    alt={props.guideImageAlt2}
                    width={1280}
                    height={720}
                    className="h-auto w-full object-contain"
                    sizes="100vw"
                    unoptimized
                  />
                </figure>
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
              <div className="relative mb-1 flex h-16 w-16 items-center justify-center">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-border border-t-primary motion-reduce:animate-none"
                  aria-hidden
                />
                <span className="text-sm font-semibold tabular-nums text-primary">
                  {props.importProgress?.isDeterminate
                    ? `${Math.round(props.importProgress.percent)}%`
                    : "…"}
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
                <p className="max-w-full truncate text-[13px] font-medium text-primary">
                  {props.importFile.name}
                </p>
              ) : null}
            </section>
          ) : (
            <div className="space-y-4 px-4 pt-4">
              <MobileProgress
                percent={props.flowProgressPercent}
                stepLabel={props.flowStepLabel}
                ariaLabel={props.flowProgressAria}
              />
              <OverviewMobileHero
                title={
                  props.provider === "spotify" ? t("import.spotifyTitle") : t("import.appleTitle")
                }
                description={
                  props.providerHasExistingData
                    ? t("import.outcomeExistingKept", {
                        count: props.listenCount.toLocaleString(),
                      })
                    : t("import.outcomeFirstImportTitle", { provider: props.providerLabel })
                }
              />
              {props.importInlineError ? (
                <p className="text-sm leading-relaxed text-accent-rose" role="alert">
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
                className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 border border-dashed border-glass-hairline px-4 py-5 text-center"
                onClick={() => props.fileInputRef.current?.click()}
              >
                <UploadCloud className="h-6 w-6 text-muted" strokeWidth={1.75} aria-hidden />
                <span className="text-sm font-medium text-foreground">{t("mobile.chooseFile")}</span>
                <span className="text-[13px] text-muted">
                  {props.provider === "spotify" ? t("import.dropSubSpotify") : t("import.dropSubApple")}
                </span>
                {props.importFile ? (
                  <span className="mt-1 text-[13px] font-medium text-primary">
                    {t("import.selectedFile", { name: props.importFile.name })}
                  </span>
                ) : null}
              </button>
              <div className="space-y-0">
                {props.providerHasExistingData ? (
                  <button type="button" className={LIST_ROW} onClick={() => setModeSheetOpen(true)}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {t("mobile.modeRow")}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">
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
                    className={LIST_ROW}
                    onClick={props.onVerifySpotifyWeb}
                    disabled={props.isImporting}
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {t("mobile.spotifyWebRow")}
                    </span>
                    <ChevronIcon />
                  </button>
                ) : null}
                <button type="button" className={LIST_ROW} onClick={() => setHelpSheetOpen(true)}>
                  <span className="min-w-0 flex-1 text-sm font-medium">{t("mobile.fileHelpRow")}</span>
                  <ChevronIcon />
                </button>
                {props.provider === "apple" ? (
                  <a
                    href={props.appleArchiveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LIST_ROW}
                    aria-label={`${t("import.openAppleDownloads")} (${t("externalLinkAria")})`}
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {t("import.openAppleDownloads")}
                    </span>
                    <ChevronIcon />
                  </a>
                ) : null}
              </div>
            </div>
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
              <p className="text-[13px] leading-relaxed text-muted">{t("import.modeIntro")}</p>
              <label className={`${LIST_ROW} cursor-pointer items-start`}>
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
                <span className="min-w-0 flex-1 space-y-1 text-sm">
                  <span className="block font-medium text-foreground">{t("import.modeIncremental")}</span>
                  <span className="block text-[13px] text-muted">
                    {props.importCursorDateLabel
                      ? t("import.modeIncrementalHint", {
                          date: props.importCursorDateLabel,
                          count: props.listenCount.toLocaleString(),
                        })
                      : t("import.modeIncrementalHintGeneric")}
                  </span>
                </span>
              </label>
              <label className={`${LIST_ROW} cursor-pointer items-start`}>
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
                <span className="min-w-0 flex-1 space-y-1 text-sm">
                  <span className="block font-medium text-foreground">{t("import.modeFull")}</span>
                  <span className="block text-[13px] text-muted">{t("import.modeFullHint")}</span>
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
                  <figure className={GUIDE_FIGURE}>
                    <Image
                      src="/onboarding/spotify-email-download.png"
                      alt={t("imageAltSpotifyEmail")}
                      width={1280}
                      height={720}
                      className="h-auto w-full object-contain"
                      sizes="100vw"
                    />
                  </figure>
                  <figure className={GUIDE_FIGURE}>
                    <Image
                      src="/onboarding/spotify-download-zip-file.png"
                      alt={t("imageAltSpotifyDownloadZip")}
                      width={1280}
                      height={720}
                      className="h-auto w-full object-contain"
                      sizes="100vw"
                    />
                  </figure>
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
          <div className="space-y-6 px-4 pt-4">
            <MobileProgress
              percent={props.flowProgressPercent}
              stepLabel={props.flowStepLabel}
              ariaLabel={props.flowProgressAria}
            />
            {props.importSummary ? (
              <div className="space-y-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-emerald/15"
                  aria-hidden
                >
                  <CheckCircle2 className="h-7 w-7 text-accent-emerald" strokeWidth={1.8} />
                </div>
                <p className={`${DASHBOARD_SECTION_EYEBROW} text-accent-emerald`}>
                  {t("finishSuccessEyebrow")}
                </p>
                <OverviewMobileHero
                  title={t("finishSuccessTitle")}
                  description={
                    props.importSummary.mode === "incremental"
                      ? t("finishSuccessBodyAppend", {
                          imported: props.importSummary.imported.toLocaleString(),
                          skipped: props.importSummary.skippedDuplicates.toLocaleString(),
                        })
                      : t("finishSuccessBody", {
                          imported: props.importSummary.imported.toLocaleString(),
                          skipped: props.importSummary.skippedDuplicates.toLocaleString(),
                        })
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className={DASHBOARD_SECTION_EYEBROW}>{t("finishSkippedEyebrow")}</p>
                <OverviewMobileHero title={t("finishTitle")} description={t("finishBody")} />
              </div>
            )}

            {finishHasExtras ? (
              <div className="space-y-6">
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
                  <section aria-label={t("genreBackfill.title")}>
                    <GenreAiPanelChrome>
                      <div className="space-y-5">
                        <div className="flex gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14"
                            aria-hidden
                          >
                            {props.hasBackfillInProgress ? (
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                              <Sparkles className="h-5 w-5 text-accent-cyan" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-base font-semibold leading-snug text-foreground">
                              {t("genreBackfill.title")}
                            </p>
                            <p className="text-[13px] leading-relaxed text-muted">
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
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border dark:bg-foreground/[0.08]">
                          <div
                            className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out"
                            style={{
                              width: `${Math.round(props.backfillProgressRatio * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="grid gap-3">
                          <p className="text-[13px] font-medium text-accent-emerald">
                            {t("genreBackfill.artistsProcessed", {
                              count: props.effectiveBackfill.artistsProcessed,
                            })}
                          </p>
                          <p className="text-[13px] font-medium text-primary">
                            {t("genreBackfill.artistsMapped", {
                              count: props.effectiveBackfill.artistsMapped,
                            })}
                          </p>
                          <p className="text-[13px] font-medium text-accent-cyan">
                            {t("genreBackfill.tracksUpdated", {
                              count: props.effectiveBackfill.tracksUpdated,
                            })}
                          </p>
                        </div>
                        {props.effectiveBackfill.errorMessage ? (
                          <p className="text-[13px] leading-relaxed text-accent-rose" role="alert">
                            {t("genreBackfill.error", {
                              message: props.effectiveBackfill.errorMessage,
                            })}
                          </p>
                        ) : null}
                        {props.shouldOfferNextLlmSession || props.shouldOfferRetryLlmSession ? (
                          <div className="space-y-3 border-t border-glass-hairline pt-4">
                            <button
                              type="button"
                              className={`${ONBOARDING_GENRE_AI_ACCEPT_BTN} w-full`}
                              disabled={props.isStartingLlmBackfill || props.hasActiveGroqJobShared}
                              onClick={props.onStartGenreLlm}
                            >
                              {props.isStartingLlmBackfill ? (
                                <>
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                  <span>{t("genreLlmConsent.starting")}</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                                  <span>{t("genreLlmConsent.startNextSession")}</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </GenreAiPanelChrome>
                  </section>
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
                    className={LIST_ROW}
                    onClick={props.onGoToPalette}
                    disabled={props.isSubmitting}
                  >
                    <span className="min-w-0 flex-1 text-left text-sm font-medium">
                      {t("finishPaletteCta", { count: props.paletteInvitation.unknownArtists })}
                    </span>
                    <ChevronIcon />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
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
