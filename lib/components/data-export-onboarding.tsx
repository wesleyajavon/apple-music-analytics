"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Music2,
  Palette,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { DashboardHeroTitle } from "@/lib/components/dashboard-hero-title";
import { OnboardingMobileStickyActions } from "@/lib/components/onboarding-mobile-sticky-actions";
import { useGenreBackfillJobSafe } from "@/lib/context/genre-backfill-job-context";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import { extractSpotifyStreamingHistoryJsonTextsFromZip } from "@/lib/services/listening/extract-spotify-export-zip";
import {
  ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS,
  ONBOARDING_IMPORT_MAX_PARSED_ROWS,
} from "@/lib/services/listening/onboarding-import-constants";
import type { NormalizedListenInput } from "@/lib/services/listening/onboarding-import-types";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";
import { parseSpotifyStreamingHistoryAudioJson } from "@/lib/services/listening/parse-spotify-streaming-history-json";
import { isGroqGenreNudgeEligible } from "@/lib/utils/genre-ai-nudge-eligibility";
import {
  clearGenreBackfillBannerBlockingPrefs,
  getGenreBackfillBannerOptOut,
  setGenreBackfillBannerOptOut,
} from "@/lib/utils/genre-backfill-banner-prefs";

type Phase = "welcome" | "pick" | "guide" | "import" | "finish";
type MusicProvider = "spotify" | "apple";

const SPOTIFY_LOGO_SRC = "/brand/providers/spotify-icon.svg";
const APPLE_MUSIC_LOGO_SRC = "/brand/providers/apple-music-icon.svg";

type GuideStep = {
  titleKey:
    | "step1Title"
    | "step2Title"
    | "step3Title"
    | "step4Title"
    | "step5Title"
    | "step6Title"
    | "step7Title"
    | "step8Title";
  bodyKey:
    | "step1Body"
    | "step2Body"
    | "step3Body"
    | "step4Body"
    | "step5Body"
    | "step6Body"
    | "step7Body"
    | "step8Body";
  imageSrc: string;
  altKey:
    | "imageAltSpotifyStep1"
    | "imageAltSpotifyStep2"
    | "imageAltAppleStep1"
    | "imageAltAppleStep2"
    | "imageAltAppleStep3"
    | "imageAltAppleStep4"
    | "imageAltAppleStep5"
    | "imageAltAppleStep6"
    | "imageAltAppleStep7"
    | "imageAltAppleStep8";
  /** Second screenshot (e.g. nested folder + target file). */
  imageSrc2?: string;
  altKey2?: "imageAltAppleStep8b";
};

type GenreBackfillJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

type GenreBackfillJob = {
  id: string;
  status: GenreBackfillJobStatus;
  targetUnknownPct: number;
  maxArtists: number;
  artistsProcessed: number;
  artistsMapped: number;
  tracksUpdated: number;
  apiRequestsUsed: number;
  initialUnknownPct: number | null;
  currentUnknownPct: number | null;
  errorMessage: string | null;
};

const SPOTIFY_STEPS: GuideStep[] = [
  {
    titleKey: "step1Title",
    bodyKey: "step1Body",
    imageSrc: "/onboarding/spotify-step-1.png",
    altKey: "imageAltSpotifyStep1",
  },
  {
    titleKey: "step2Title",
    bodyKey: "step2Body",
    imageSrc: "/onboarding/spotify-step-2.png",
    altKey: "imageAltSpotifyStep2",
  },
];

const APPLE_STEPS: GuideStep[] = [
  {
    titleKey: "step1Title",
    bodyKey: "step1Body",
    imageSrc: "/onboarding/apple-step-1.png",
    altKey: "imageAltAppleStep1",
  },
  {
    titleKey: "step2Title",
    bodyKey: "step2Body",
    imageSrc: "/onboarding/apple-step-2.png",
    altKey: "imageAltAppleStep2",
  },
  {
    titleKey: "step3Title",
    bodyKey: "step3Body",
    imageSrc: "/onboarding/apple-step-3.png",
    altKey: "imageAltAppleStep3",
  },
  {
    titleKey: "step4Title",
    bodyKey: "step4Body",
    imageSrc: "/onboarding/apple-step-4.png",
    altKey: "imageAltAppleStep4",
  },
  {
    titleKey: "step5Title",
    bodyKey: "step5Body",
    imageSrc: "/onboarding/apple-step-5.png",
    altKey: "imageAltAppleStep5",
  },
  {
    titleKey: "step6Title",
    bodyKey: "step6Body",
    imageSrc: "/onboarding/apple-step-6.png",
    altKey: "imageAltAppleStep6",
  },
  {
    titleKey: "step7Title",
    bodyKey: "step7Body",
    imageSrc: "/onboarding/apple-step-7.png",
    altKey: "imageAltAppleStep7",
  },
  {
    titleKey: "step8Title",
    bodyKey: "step8Body",
    imageSrc: "/onboarding/apple-step-8.png",
    altKey: "imageAltAppleStep8",
    imageSrc2: "/onboarding/apple-step-8b.png",
    altKey2: "imageAltAppleStep8b",
  },
];

/** En dessous de ~4,5 Mo (plafond Vercel sur le corps des requêtes), l’upload multipart classique suffit. */
const VERCEL_SAFE_MULTIPART_MAX_BYTES = 4 * 1024 * 1024;

/** Trait / remplissage brand (s’aligne sur --brand-* en clair et sombre). */
const ONBOARDING_RAIL_CLASS = "bg-brand-gradient";
const ONBOARDING_SHELL_CLASS =
  "rounded-3xl border border-card-border/70 bg-card px-6 py-8 sm:px-8 sm:py-10";
const ONBOARDING_SURFACE_CLASS =
  "rounded-3xl border border-card-border/70 bg-card px-6 py-8 sm:px-8";

function OnboardingShell({ children }: { children: ReactNode }) {
  return <div className={ONBOARDING_SHELL_CLASS}>{children}</div>;
}

/** Carte « genres IA » — surfaces thème + accents brand (pas de violet/cyan Tailwind hors tokens). */
const GENRE_AI_SURFACE =
  "relative overflow-hidden rounded-2xl border border-card-border bg-card-surface bg-gradient-to-br from-primary/[0.07] via-transparent to-accent-cyan/[0.05] shadow-card ring-1 ring-primary/[0.12] dark:from-primary/[0.11] dark:to-accent-indigo/[0.06] dark:ring-primary/[0.16]";

const GENRE_AI_ACCEPT_BTN =
  "group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:min-w-[min(100%,260px)]";

const GENRE_AI_DECLINE_BTN =
  "inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-card-border bg-surface-raised px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/28 hover:bg-primary/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/12 dark:bg-white/[0.06] dark:hover:border-white/22 dark:hover:bg-white/[0.1] sm:w-auto sm:min-w-[min(100%,200px)]";

function GenreAiPanelChrome({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${GENRE_AI_SURFACE} ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(var(--border-rgb)_/_0.5)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--border-rgb)_/_0.42)_1px,transparent_1px)] bg-[size:22px_22px] opacity-[0.45] dark:opacity-[0.28]" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ONBOARDING_RAIL_CLASS} opacity-85`} />
      <div className="relative">{children}</div>
    </div>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Linear onboarding progress: welcome → pick → guide (per step) → import screen → finish.
 * Before a provider is chosen, the longest guide (Apple) is used so the bar does not max out early.
 */
function getOnboardingFlowProgressPercent(
  phase: Phase,
  stepIndex: number,
  provider: MusicProvider | null,
  spotifyGuideCount: number,
  appleGuideCount: number,
): number {
  const guideLen =
    provider === "spotify"
      ? spotifyGuideCount
      : provider === "apple"
        ? appleGuideCount
        : appleGuideCount;

  const totalSegments = 2 + guideLen + 2;

  let segmentIndex: number;
  switch (phase) {
    case "welcome":
      segmentIndex = 0;
      break;
    case "pick":
      segmentIndex = 1;
      break;
    case "guide":
      segmentIndex = 2 + stepIndex;
      break;
    case "import":
      segmentIndex = 2 + guideLen;
      break;
    case "finish":
      segmentIndex = 2 + guideLen + 1;
      break;
  }

  return Math.min(100, Math.round(((segmentIndex + 1) / totalSegments) * 100));
}

function OnboardingFlowProgressBar({
  percent,
  variant,
  ariaLabel,
}: {
  percent: number;
  variant: "hero" | "surface";
  ariaLabel: string;
}) {
  const trough =
    variant === "hero"
      ? "bg-muted/30 ring-1 ring-inset ring-primary/10 dark:bg-foreground/[0.08] dark:ring-white/[0.08]"
      : "bg-border";
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={`h-1.5 w-full max-w-md overflow-hidden rounded-full ${trough}`}
    >
      <div
        className={`h-full rounded-full ${ONBOARDING_RAIL_CLASS} shadow-glow transition-[width] duration-500 ease-out`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function OnboardingTopProgress({
  percent,
  stepLabel,
  ariaLabel,
}: {
  percent: number;
  stepLabel: string;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span className="font-medium">{stepLabel}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <OnboardingFlowProgressBar percent={percent} variant="hero" ariaLabel={ariaLabel} />
    </div>
  );
}

function listensToJsonRows(rows: NormalizedListenInput[]) {
  return rows.map((r) => ({
    artistName: r.artistName,
    trackName: r.trackName,
    playedAt: r.playedAt.toISOString(),
  }));
}

type ImportOverlayKind = "file" | "spotify_web";
type ImportProgressPhase =
  | "checking"
  | "reading"
  | "parsing"
  | "validating"
  | "uploading"
  | "finalizing";

type ImportProgress = {
  phase: ImportProgressPhase;
  percent: number;
  processedRows?: number;
  totalRows?: number;
  batchIndex?: number;
  batchCount?: number;
  isDeterminate: boolean;
};

function clampProgressPercent(percent: number) {
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export function DataExportOnboarding({
  hasSpotifyWebConnection = false,
  initialGenreAiLanding = false,
}: {
  hasSpotifyWebConnection?: boolean;
  /** Ouvre directement la page de fin avec le bloc consentement Groq lorsque eligible (voir `genreAi` URL sur onboarding). */
  initialGenreAiLanding?: boolean;
} = {}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const locale = useLocale();
  const genreBackfillShared = useGenreBackfillJobSafe();
  const hasActiveGroqJobShared = genreBackfillShared?.hasActiveGroqJob ?? false;
  const refreshGroqJobShared = genreBackfillShared?.refreshStatus;
  const [phase, setPhase] = useState<Phase>("welcome");
  const [provider, setProvider] = useState<MusicProvider | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importOverlayKind, setImportOverlayKind] =
    useState<ImportOverlayKind>("file");
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    skippedDuplicates: number;
  } | null>(null);
  const [paletteInvitation, setPaletteInvitation] = useState<{
    shouldInvite: boolean;
    unknownRatio: number;
    unknownArtists: number;
  } | null>(null);
  const [genreBackfillJob, setGenreBackfillJob] = useState<{
    id: string;
    status: GenreBackfillJobStatus;
    reused: boolean;
  } | null>(null);
  const [genreBackfillStatus, setGenreBackfillStatus] = useState<GenreBackfillJob | null>(null);
  const [genreLlmAfterImport, setGenreLlmAfterImport] = useState<{
    unknownTrackCount: number;
    unknownRatio: number;
    totalTrackCount: number;
    groqConfigured: boolean;
  } | null>(null);
  const [genreLlmDeclined, setGenreLlmDeclined] = useState(false);
  const [isStartingLlmBackfill, setIsStartingLlmBackfill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Après redirection depuis la notification « Unknown majoritaire », défiler jusqu’au consentement IA. */
  const genreAiScrollPendingRef = useRef(false);

  const steps = useMemo(() => {
    if (provider === "spotify") return SPOTIFY_STEPS;
    if (provider === "apple") return APPLE_STEPS;
    return [];
  }, [provider]);

  const flowProgressPercent = useMemo(
    () =>
      getOnboardingFlowProgressPercent(
        phase,
        stepIndex,
        provider,
        SPOTIFY_STEPS.length,
        APPLE_STEPS.length,
      ),
    [phase, stepIndex, provider],
  );
  const flowProgressAria = t("flowProgressAriaLabel", { percent: flowProgressPercent });
  const flowStepLabel = useMemo(() => {
    switch (phase) {
      case "welcome":
        return t("flowRail.intro");
      case "pick":
        return t("flowRail.choose");
      case "guide":
        return t("guideStepCounterLabel", {
          current: stepIndex + 1,
          total: steps.length,
        });
      case "import":
        return t("flowRail.upload");
      case "finish":
        return t("flowRail.done");
      default:
        return t("flowRail.intro");
    }
  }, [phase, stepIndex, steps.length, t]);

  const refreshGenreBackfillStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status?includeTerminal=1");
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as {
        job?: GenreBackfillJob | null;
      };
      setGenreBackfillStatus(data.job ?? null);
    } catch {
      // Best effort only.
    }
  }, []);

  useEffect(() => {
    if (!initialGenreAiLanding) return;

    let cancelled = false;

    async function openGenreAiLanding() {
      if (typeof window !== "undefined" && getGenreBackfillBannerOptOut()) return;

      try {
        const res = await fetch(
          "/api/user/onboarding/import/genre-backfill/status?includeTerminal=1&includeEligibility=1"
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          job?: GenreBackfillJob | null;
          eligibility?: {
            groqConfigured: boolean;
            unknownRatio: number;
            unknownTrackCount: number;
            totalTrackCount: number;
          } | null;
        };
        if (data.ok !== true) return;

        const eligibility = data.eligibility;
        if (!eligibility || !isGroqGenreNudgeEligible(eligibility)) return;

        const job = data.job;
        const activeStatuses: GenreBackfillJobStatus[] = ["pending", "running", "paused"];
        if (job && activeStatuses.includes(job.status)) return;

        setGenreLlmAfterImport(eligibility);
        setGenreLlmDeclined(false);
        setGenreBackfillJob(null);
        setImportSummary(null);
        genreAiScrollPendingRef.current = true;
        setPhase("finish");
      } catch {
        /* best effort */
      }
    }

    void openGenreAiLanding();
    return () => {
      cancelled = true;
    };
  }, [initialGenreAiLanding]);

  useEffect(() => {
    if (!genreAiScrollPendingRef.current) return;
    if (phase !== "finish" || !genreLlmAfterImport) return;
    genreAiScrollPendingRef.current = false;
    const id = window.setTimeout(() => {
      document.getElementById("onboarding-genre-llm-consent-heading")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 300);
    return () => window.clearTimeout(id);
  }, [phase, genreLlmAfterImport]);

  useEffect(() => {
    if (phase !== "finish" || !genreBackfillJob?.id) return;
    void refreshGenreBackfillStatus();
    const intervalId = window.setInterval(() => {
      void refreshGenreBackfillStatus();
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [phase, genreBackfillJob?.id, refreshGenreBackfillStatus]);

  const completeOnboarding = useCallback(
    async (nextPath = "/dashboard/overview") => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/user/onboarding/complete", { method: "POST" });
        if (!res.ok) throw new Error("complete_failed");
        // Full navigation avoids a soft-nav redirect loop: onboarding page revalidation
        // can redirect to overview while `(main)/layout` still serves stale RSC data.
        window.location.assign(getPathname({ href: nextPath, locale }));
      } catch {
        toast.error(t("completeError"));
        setIsSubmitting(false);
      }
    },
    [locale, t],
  );

  const spotifyPrivacyUrl = t("spotifyUrls.privacy");
  const applePrivacyUrl = t("appleUrls.privacy");
  const appleArchiveUrl = t("appleUrls.archive");

  function selectProvider(p: MusicProvider) {
    setProvider(p);
    setStepIndex(0);
    setPhase("guide");
  }

  function goNextGuide() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }
    setImportFile(null);
    setImportSummary(null);
    setPhase("import");
  }

  function goBackGuide() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      return;
    }
    setPhase("pick");
    setProvider(null);
  }

  function goBackImport() {
    setPhase("guide");
    setStepIndex(Math.max(0, steps.length - 1));
    setImportFile(null);
    setImportOverlayKind("file");
  }

  const verifySpotifyWebConnection = useCallback(async () => {
    setImportOverlayKind("spotify_web");
    setImportProgress({
      phase: "checking",
      percent: 35,
      isDeterminate: false,
    });
    setIsImporting(true);
    try {
      type VerifyOkJson = {
        ok?: boolean;
        error?: string;
        code?: string;
      };

      const res = await fetch("/api/spotify/connection-verify", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as VerifyOkJson;

      if (!res.ok) {
        if (isRecentAuthRequiredError(data)) {
          toast.error(t("import.recentAuthRequired"));
          redirectToRecentSignIn(window.location.pathname + window.location.search);
          return;
        }
        if (res.status === 401) {
          toast.error(t("import.recentAuthRequired"));
          return;
        }
        if (res.status === 404) {
          toast.error(t("import.spotifyWebNoConnection"));
          return;
        }
        toast.error(data?.error?.trim() || t("import.spotifyWebVerifyError"));
        return;
      }

      toast.success(t("import.spotifyWebVerifySuccess"));
      router.replace("/dashboard/spotify-snapshot");
    } catch {
      toast.error(t("import.spotifyWebVerifyError"));
    } finally {
      setIsImporting(false);
      setImportOverlayKind("file");
      setImportProgress(null);
    }
  }, [t, router]);

  const submitImport = useCallback(async () => {
    if (!provider || !importFile) {
      toast.error(t("import.noFile"));
      return;
    }
    setImportOverlayKind("file");
    setImportProgress({
      phase: "reading",
      percent: 5,
      isDeterminate: true,
    });
    setIsImporting(true);
    try {
      const useLargeFilePath = importFile.size >= VERCEL_SAFE_MULTIPART_MAX_BYTES;

      type ImportOkJson = {
        error?: string;
        code?: string;
        imported?: number;
        skippedDuplicates?: number;
        skippedInvalid?: number;
        genreLlmBackfill?: {
          unknownTrackCount?: number;
          unknownRatio?: number;
          totalTrackCount?: number;
          groqConfigured?: boolean;
        } | null;
        paletteInvitation?: {
          shouldInvite?: boolean;
          unknownRatio?: number;
          unknownArtists?: number;
        };
      };

      if (!useLargeFilePath) {
        setImportProgress({
          phase: "uploading",
          percent: 40,
          isDeterminate: false,
        });
        const fd = new FormData();
        fd.append("provider", provider);
        fd.append("file", importFile);
        const res = await fetch("/api/user/onboarding/import", { method: "POST", body: fd });
        const data = (await res.json().catch(() => ({}))) as ImportOkJson;
        if (!res.ok) {
          if (isRecentAuthRequiredError(data)) {
            toast.error(t("import.recentAuthRequired"));
            redirectToRecentSignIn(window.location.pathname + window.location.search);
            return;
          }
          toast.error(data?.error ?? t("import.importError"));
          return;
        }
        setImportProgress({
          phase: "finalizing",
          percent: 95,
          isDeterminate: true,
        });
        const imported = data.imported ?? 0;
        const skippedDuplicates = data.skippedDuplicates ?? 0;
        setImportSummary({ imported, skippedDuplicates });
        if (data.paletteInvitation) {
          setPaletteInvitation({
            shouldInvite: Boolean(data.paletteInvitation.shouldInvite),
            unknownRatio: Number(data.paletteInvitation.unknownRatio ?? 0),
            unknownArtists: Number(data.paletteInvitation.unknownArtists ?? 0),
          });
        } else {
          setPaletteInvitation(null);
        }
        setGenreBackfillJob(null);
        setGenreBackfillStatus(null);
        setGenreLlmDeclined(false);
        if (data.genreLlmBackfill && (data.genreLlmBackfill.unknownTrackCount ?? 0) > 0) {
          setGenreLlmAfterImport({
            unknownTrackCount: Number(data.genreLlmBackfill.unknownTrackCount ?? 0),
            unknownRatio: Number(data.genreLlmBackfill.unknownRatio ?? 0),
            totalTrackCount: Number(data.genreLlmBackfill.totalTrackCount ?? 0),
            groqConfigured: Boolean(data.genreLlmBackfill.groqConfigured),
          });
        } else {
          setGenreLlmAfterImport(null);
        }
        toast.success(t("import.toastSuccess", { count: imported }));
        setPhase("finish");
        return;
      }

      let allRows: NormalizedListenInput[];

      if (provider === "spotify") {
        if (!importFile.name.toLowerCase().endsWith(".zip")) {
          toast.error(t("import.importError"));
          return;
        }
        setImportProgress({
          phase: "reading",
          percent: 8,
          isDeterminate: true,
        });
        await yieldToBrowser();
        const buf = await importFile.arrayBuffer();
        setImportProgress({
          phase: "parsing",
          percent: 18,
          isDeterminate: true,
        });
        await yieldToBrowser();
        const jsonTexts = await extractSpotifyStreamingHistoryJsonTextsFromZip(buf);
        if (jsonTexts.length === 0) {
          toast.error(t("import.zipMissingAudioJson"));
          return;
        }
        allRows = jsonTexts.flatMap((text) => parseSpotifyStreamingHistoryAudioJson(text));
      } else {
        if (!importFile.name.toLowerCase().endsWith(".csv")) {
          toast.error(t("import.importError"));
          return;
        }
        setImportProgress({
          phase: "reading",
          percent: 8,
          isDeterminate: true,
        });
        await yieldToBrowser();
        const csvText = await importFile.text();
        setImportProgress({
          phase: "parsing",
          percent: 18,
          isDeterminate: true,
        });
        await yieldToBrowser();
        allRows = parseApplePlayHistoryDailyTracksCsv(csvText);
      }

      setImportProgress({
        phase: "validating",
        percent: 25,
        totalRows: allRows.length,
        isDeterminate: true,
      });
      if (allRows.length === 0) {
        toast.error(t("import.noParsedListens"));
        return;
      }
      if (allRows.length > ONBOARDING_IMPORT_MAX_PARSED_ROWS) {
        toast.error(
          t("import.tooManyPlays", { max: ONBOARDING_IMPORT_MAX_PARSED_ROWS.toLocaleString() })
        );
        return;
      }

      const chunks = chunkArray(allRows, ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS);
      let sumImported = 0;
      let sumSkippedDup = 0;
      let lastPayload: ImportOkJson | null = null;

      for (let i = 0; i < chunks.length; i++) {
        setImportProgress({
          phase: "uploading",
          percent: clampProgressPercent(30 + (i / chunks.length) * 60),
          processedRows: Math.min(i * ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS, allRows.length),
          totalRows: allRows.length,
          batchIndex: i + 1,
          batchCount: chunks.length,
          isDeterminate: true,
        });
        const body: Record<string, unknown> = {
          provider,
          rows: listensToJsonRows(chunks[i]!),
        };
        if (chunks.length > 1) {
          body.batch = { index: i, count: chunks.length };
          if (i === chunks.length - 1) {
            body.sessionTotalImported = sumImported;
          }
        }

        const res = await fetch("/api/user/onboarding/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as ImportOkJson;
        if (!res.ok) {
          if (isRecentAuthRequiredError(data)) {
            toast.error(t("import.recentAuthRequired"));
            redirectToRecentSignIn(window.location.pathname + window.location.search);
            return;
          }
          toast.error(data?.error ?? t("import.importError"));
          return;
        }
        sumImported += data.imported ?? 0;
        sumSkippedDup += data.skippedDuplicates ?? 0;
        lastPayload = data;
        setImportProgress({
          phase: "uploading",
          percent: clampProgressPercent(30 + ((i + 1) / chunks.length) * 60),
          processedRows: Math.min((i + 1) * ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS, allRows.length),
          totalRows: allRows.length,
          batchIndex: i + 1,
          batchCount: chunks.length,
          isDeterminate: true,
        });
      }

      if (!lastPayload) {
        toast.error(t("import.importError"));
        return;
      }

      setImportProgress({
        phase: "finalizing",
        percent: 95,
        processedRows: allRows.length,
        totalRows: allRows.length,
        batchCount: chunks.length,
        isDeterminate: true,
      });
      setImportSummary({
        imported: sumImported,
        skippedDuplicates: sumSkippedDup,
      });
      if (lastPayload.paletteInvitation) {
        setPaletteInvitation({
          shouldInvite: Boolean(lastPayload.paletteInvitation.shouldInvite),
          unknownRatio: Number(lastPayload.paletteInvitation.unknownRatio ?? 0),
          unknownArtists: Number(lastPayload.paletteInvitation.unknownArtists ?? 0),
        });
      } else {
        setPaletteInvitation(null);
      }
      setGenreBackfillJob(null);
      setGenreBackfillStatus(null);
      setGenreLlmDeclined(false);
      if (lastPayload.genreLlmBackfill && (lastPayload.genreLlmBackfill.unknownTrackCount ?? 0) > 0) {
        setGenreLlmAfterImport({
          unknownTrackCount: Number(lastPayload.genreLlmBackfill.unknownTrackCount ?? 0),
          unknownRatio: Number(lastPayload.genreLlmBackfill.unknownRatio ?? 0),
          totalTrackCount: Number(lastPayload.genreLlmBackfill.totalTrackCount ?? 0),
          groqConfigured: Boolean(lastPayload.genreLlmBackfill.groqConfigured),
        });
      } else {
        setGenreLlmAfterImport(null);
      }
      toast.success(t("import.toastSuccess", { count: sumImported }));
      setPhase("finish");
    } catch {
      toast.error(t("import.importError"));
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  }, [importFile, provider, t]);

  function skipImportToFinish() {
    setImportSummary(null);
    setGenreBackfillJob(null);
    setGenreBackfillStatus(null);
    setGenreLlmAfterImport(null);
    setGenreLlmDeclined(false);
    setPhase("finish");
  }

  const startLlmGenreBackfill = useCallback(async () => {
    setIsStartingLlmBackfill(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        jobId?: string;
        status?: GenreBackfillJobStatus;
        reused?: boolean;
      };
      if (!res.ok) {
        toast.error(data?.error ?? t("genreLlmConsent.startError"));
        return;
      }
      if (data.jobId && data.status) {
        clearGenreBackfillBannerBlockingPrefs();
        setGenreBackfillJob({
          id: data.jobId,
          status: data.status,
          reused: Boolean(data.reused),
        });
        setGenreBackfillStatus(null);
        setGenreLlmAfterImport(null);
        toast.success(t("genreLlmConsent.startedToast"));
        if (refreshGroqJobShared) {
          await refreshGroqJobShared();
          window.setTimeout(() => void refreshGroqJobShared(), 500);
        }
      }
    } catch {
      toast.error(t("genreLlmConsent.startError"));
    } finally {
      setIsStartingLlmBackfill(false);
    }
  }, [t, refreshGroqJobShared]);

  const surfaceShellClass = ONBOARDING_SURFACE_CLASS;

  const primaryBtn =
    "inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto";

  const secondaryBtn =
    "inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-card-border bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/20 disabled:opacity-60 lg:w-auto";

  const welcomeContinueBtn =
    "group inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:opacity-[0.96] disabled:opacity-60 sm:w-auto";

  const welcomeSkipBtn =
    "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-55 sm:w-auto";

  const pickSkipBtn = welcomeSkipBtn;

  const effectiveBackfill = useMemo(
    () =>
      genreBackfillStatus ??
      (genreBackfillJob
        ? {
            id: genreBackfillJob.id,
            status: genreBackfillJob.status,
            targetUnknownPct: 15,
            maxArtists: 0,
            artistsProcessed: 0,
            artistsMapped: 0,
            tracksUpdated: 0,
            apiRequestsUsed: 0,
            initialUnknownPct: null,
            currentUnknownPct: null,
            errorMessage: null,
          }
        : null),
    [genreBackfillJob, genreBackfillStatus]
  );
  const hasBackfillInProgress =
    effectiveBackfill?.status === "pending" ||
    effectiveBackfill?.status === "running" ||
    effectiveBackfill?.status === "paused";
  const shouldOfferNextLlmSession =
    effectiveBackfill?.status === "completed" &&
    effectiveBackfill.currentUnknownPct != null &&
    effectiveBackfill.currentUnknownPct > effectiveBackfill.targetUnknownPct;
  const shouldOfferRetryLlmSession =
    effectiveBackfill?.status === "failed" || effectiveBackfill?.status === "cancelled";
  const backfillProgressRatio = useMemo(() => {
    if (!effectiveBackfill) return 0;
    if (effectiveBackfill.maxArtists > 0) {
      return Math.min(1, effectiveBackfill.artistsProcessed / effectiveBackfill.maxArtists);
    }
    return effectiveBackfill.status === "completed" ? 1 : 0;
  }, [effectiveBackfill]);

  const finishSurfaceHasExtras =
    Boolean(
      genreLlmAfterImport &&
        genreLlmAfterImport.unknownTrackCount > 0 &&
        !genreBackfillJob?.id &&
        !genreLlmDeclined &&
        !hasActiveGroqJobShared,
    ) || Boolean(effectiveBackfill);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-24 lg:space-y-10 lg:pb-16">
      <OnboardingTopProgress
        percent={flowProgressPercent}
        stepLabel={flowStepLabel}
        ariaLabel={flowProgressAria}
      />

      {phase === "welcome" && (
        <OnboardingShell>
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted">{t("welcomeEyebrow")}</p>
              <DashboardHeroTitle icon={Music2} variant="onboarding" className="!mt-0">
                {t("welcomeTitle")}
              </DashboardHeroTitle>
              <p className="max-w-lg text-base leading-relaxed text-muted">{t("welcomeBody")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" className={welcomeContinueBtn} onClick={() => setPhase("pick")}>
                <span>{t("continue")}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className={welcomeSkipBtn}
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                {t("skipForNow")}
              </button>
            </div>
            <p className="text-xs text-muted">{t("skipHint")}</p>
          </div>
        </OnboardingShell>
      )}

      {phase === "pick" && (
        <div className="space-y-6">
          <OnboardingShell>
            <div className="space-y-3">
              <DashboardHeroTitle icon={Music2} variant="onboarding" className="!mt-0">
                {t("pickTitle")}
              </DashboardHeroTitle>
              <p className="text-base text-muted">{t("pickSubtitle")}</p>
            </div>
          </OnboardingShell>

          <div className={`${surfaceShellClass} space-y-3`}>
            <button
              type="button"
              onClick={() => selectProvider("spotify")}
              className="group flex w-full items-center gap-4 rounded-2xl border border-card-border px-4 py-4 text-left transition-colors hover:border-[#1DB954]/50 hover:bg-[#1DB954]/[0.04]"
            >
              <Image
                src={SPOTIFY_LOGO_SRC}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-xl object-contain"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-foreground">{t("pickSpotify")}</span>
                <span className="mt-0.5 block text-sm text-muted">{t("pickSpotifyHint")}</span>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden
              />
            </button>

            <button
              type="button"
              onClick={() => selectProvider("apple")}
              className="group flex w-full items-center gap-4 rounded-2xl border border-card-border px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
            >
              <Image
                src={APPLE_MUSIC_LOGO_SRC}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-xl object-contain"
                unoptimized
              />
              <div className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-foreground">{t("pickApple")}</span>
                <span className="mt-0.5 block text-sm text-muted">{t("pickAppleHint")}</span>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden
              />
            </button>

            <div className="flex flex-col gap-3 border-t border-card-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className={secondaryBtn} onClick={() => setPhase("welcome")}>
                {t("back")}
              </button>
              <button
                type="button"
                className={pickSkipBtn}
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                {t("skipForNow")}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "guide" && provider && steps[stepIndex] && (
        <div className={`${surfaceShellClass} space-y-6`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted">{t("guidePhaseLabel")}</p>
            <span className="text-sm tabular-nums text-muted" aria-live="polite">
              {t("guideStepCounterLabel", {
                current: stepIndex + 1,
                total: steps.length,
              })}
            </span>
          </div>
          <span className="sr-only">
            {t("stepProgress", { current: stepIndex + 1, total: steps.length })}
          </span>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t(`${provider}.${steps[stepIndex].titleKey}` as Parameters<typeof t>[0])}
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              {t(`${provider}.${steps[stepIndex].bodyKey}` as Parameters<typeof t>[0])}
            </p>
          </div>

          <a
            href={provider === "spotify" ? spotifyPrivacyUrl : applePrivacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${secondaryBtn} w-fit`}
            aria-label={`${provider === "spotify" ? t("openSpotifyPrivacy") : t("openApplePrivacy")} (${t("externalLinkAria")})`}
          >
            {provider === "spotify" ? t("openSpotifyPrivacy") : t("openApplePrivacy")} ↗
          </a>

          <div className="space-y-4">
            <figure className="overflow-hidden rounded-2xl border border-card-border bg-muted/10">
              <Image
                src={steps[stepIndex].imageSrc}
                alt={t(steps[stepIndex].altKey)}
                width={1280}
                height={720}
                className="h-auto w-full object-contain"
                sizes="(max-width: 768px) 100vw, 42rem"
                priority={stepIndex === 0}
              />
            </figure>
            {"imageSrc2" in steps[stepIndex] && steps[stepIndex].imageSrc2 && steps[stepIndex].altKey2 ? (
              <figure className="overflow-hidden rounded-2xl border border-card-border bg-muted/10">
                <Image
                  src={steps[stepIndex].imageSrc2}
                  alt={t(steps[stepIndex].altKey2)}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 768px) 100vw, 42rem"
                />
              </figure>
            ) : null}
          </div>

          <div className="hidden flex-col-reverse gap-3 border-t border-card-border pt-6 lg:flex lg:flex-row lg:justify-between">
            <button type="button" className={secondaryBtn} onClick={goBackGuide}>
              {t("back")}
            </button>
            <button type="button" className={primaryBtn} onClick={goNextGuide}>
              {t("next")}
            </button>
          </div>
        </div>
      )}

      {phase === "import" && provider && (
        <div
          className={`relative space-y-6 ${surfaceShellClass} ${
            isImporting ? "min-h-[22rem] sm:min-h-[26rem]" : ""
          }`}
        >
          {isImporting ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-surface-glass px-6 py-8 text-center shadow-inner backdrop-blur-md"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="relative mb-1 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/[0.1] ring-1 ring-primary/20">
                <div
                  className="absolute inset-2 animate-spin rounded-full border-4 border-border border-t-primary"
                  aria-hidden
                />
                <span className="text-sm font-bold tabular-nums text-primary">
                  {importProgress?.isDeterminate
                    ? `${clampProgressPercent(importProgress.percent)}%`
                    : "…"}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">
                  {importOverlayKind === "spotify_web"
                    ? t("import.importingOverlayTitleWebApi")
                    : t("import.importingOverlayTitle")}
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-muted">
                  {importProgress
                    ? t(`import.progressPhase.${importProgress.phase}`)
                    : importOverlayKind === "spotify_web"
                      ? t("import.importingOverlayHintWebApi")
                      : t("import.importingOverlayHint")}
                </p>
              </div>
              {importOverlayKind === "file" && importFile ? (
                <p
                  className="mt-1 max-w-full truncate px-2 text-xs font-medium text-primary"
                  title={importFile.name}
                >
                  {importFile.name}
                </p>
              ) : null}
              <div className="mt-2 w-full max-w-sm space-y-3">
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-border shadow-inner"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    importProgress?.isDeterminate
                      ? clampProgressPercent(importProgress.percent)
                      : undefined
                  }
                  aria-label={t("import.progressAriaLabel")}
                >
                  {importProgress?.isDeterminate ? (
                    <div
                      className="h-full rounded-full bg-primary shadow-glow transition-[width] duration-300 ease-out"
                      style={{ width: `${clampProgressPercent(importProgress.percent)}%` }}
                    />
                  ) : (
                    <div className="h-full w-1/3 rounded-full bg-primary shadow-glow animate-onboarding-import-indeterminate" />
                  )}
                </div>
                {importProgress ? (
                  <div className="flex flex-col gap-1 text-xs leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold tabular-nums text-foreground">
                      {importProgress.totalRows !== undefined &&
                      importProgress.processedRows !== undefined
                        ? t("import.progressWithRows", {
                            percent: clampProgressPercent(importProgress.percent),
                            processed: importProgress.processedRows.toLocaleString(),
                            total: importProgress.totalRows.toLocaleString(),
                          })
                        : importProgress.isDeterminate
                          ? t("import.progressPercent", {
                              percent: clampProgressPercent(importProgress.percent),
                            })
                          : t("import.progressWorking")}
                    </span>
                    {importProgress.batchCount && importProgress.batchIndex ? (
                      <span className="tabular-nums text-primary">
                        {t("import.progressBatch", {
                          current: importProgress.batchIndex,
                          total: importProgress.batchCount,
                        })}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted">{t("import.eyebrow", { step: steps.length + 1 })}</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {provider === "spotify" ? t("import.spotifyTitle") : t("import.appleTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:text-base">
              {provider === "spotify" ? t("import.spotifyBody") : t("import.appleBody")}
            </p>
          </div>

          {provider === "spotify" && hasSpotifyWebConnection ? (
            <div className="space-y-4 rounded-2xl border border-card-border bg-surface p-5 shadow-inner ring-1 ring-[#169c46]/35 dark:bg-[#1DB954]/[0.08] dark:ring-[#1ed760]/30">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#047857] dark:text-[#86efac]">
                {t("import.spotifyWebEyebrow")}
              </p>
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                {t("import.spotifyWebTitle")}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{t("import.spotifyWebBody")}</p>
              <button
                type="button"
                className={`${primaryBtn} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
                onClick={() => void verifySpotifyWebConnection()}
                disabled={isImporting}
              >
                {isImporting && importOverlayKind === "spotify_web" ? (
                  <>
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden
                    />
                    <span>{t("import.spotifyWebVerifying")}</span>
                  </>
                ) : (
                  t("import.spotifyWebCta")
                )}
              </button>
              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  {t("import.spotifyWebDivider")}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          ) : null}

          {provider === "spotify" && (
            <div className="flex flex-col gap-3">
              <figure className="overflow-hidden rounded-xl border border-card-border bg-surface shadow-inner">
                <Image
                  src="/onboarding/spotify-email-download.png"
                  alt={t("imageAltSpotifyEmail")}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 768px) 100vw, 42rem"
                />
              </figure>
              <figure className="overflow-hidden rounded-xl border border-card-border bg-surface shadow-inner">
                <Image
                  src="/onboarding/spotify-download-zip-file.png"
                  alt={t("imageAltSpotifyDownloadZip")}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 768px) 100vw, 42rem"
                />
              </figure>
            </div>
          )}

          {provider === "apple" && (
            <a
              href={appleArchiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryBtn}
              aria-label={`${t("import.openAppleDownloads")} (${t("externalLinkAria")})`}
            >
              {t("import.openAppleDownloads")} ↗
            </a>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept={provider === "spotify" ? ".zip,application/zip" : ".csv,text/csv"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setImportFile(f ?? null);
            }}
          />
          <button
            type="button"
            className="group flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-card-border bg-muted/5 px-5 py-8 text-center transition-colors hover:border-primary/35 hover:bg-primary/[0.03] disabled:pointer-events-none disabled:opacity-50"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (isImporting) return;
              const f = e.dataTransfer.files?.[0];
              if (f) setImportFile(f);
            }}
          >
            <UploadCloud className="h-8 w-8 text-muted transition-colors group-hover:text-primary" strokeWidth={1.75} aria-hidden />
            <span className="font-medium text-foreground">{t("import.dropTitle")}</span>
            <span className="max-w-xs text-xs text-muted">
              {provider === "spotify" ? t("import.dropSubSpotify") : t("import.dropSubApple")}
            </span>
            {importFile ? (
              <span className="mt-1 text-xs font-medium text-primary">
                {t("import.selectedFile", { name: importFile.name })}
              </span>
            ) : null}
          </button>

          <div className="hidden flex-col-reverse gap-3 border-t border-card-border pt-6 lg:flex lg:flex-row lg:justify-between">
            <button type="button" className={secondaryBtn} onClick={goBackImport} disabled={isImporting}>
              {t("back")}
            </button>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                type="button"
                className={`${secondaryBtn} text-muted`}
                onClick={skipImportToFinish}
                disabled={isImporting}
              >
                {t("import.skipImport")}
              </button>
              <button
                type="button"
                className={`${primaryBtn} inline-flex items-center gap-2`}
                onClick={() => void submitImport()}
                disabled={isImporting || !importFile}
              >
                {isImporting ? (
                  <>
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden
                    />
                    <span>{t("import.importing")}</span>
                  </>
                ) : (
                  t("import.importSubmit")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "guide" && provider ? (
        <OnboardingMobileStickyActions
          mode="guide"
          onBack={goBackGuide}
          onPrimary={goNextGuide}
          primaryLabel={t("next")}
        />
      ) : null}

      {phase === "import" && provider ? (
        <OnboardingMobileStickyActions
          mode="import"
          onBack={goBackImport}
          onPrimary={() => void submitImport()}
          primaryLabel={isImporting ? t("import.importing") : t("import.importSubmit")}
          primaryDisabled={isImporting || !importFile}
          secondaryLabel={t("import.skipImport")}
          onSecondary={skipImportToFinish}
          secondaryDisabled={isImporting}
          isLoading={isImporting}
        />
      ) : null}

      {phase === "finish" && (
        importSummary ? (
            <OnboardingShell>
              <div className="space-y-8 text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-emerald/10"
                  aria-hidden
                >
                  <CheckCircle2 className="h-7 w-7 text-accent-emerald" strokeWidth={1.8} />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-accent-emerald">{t("finishSuccessEyebrow")}</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {t("finishSuccessTitle")}
                  </h1>
                  <p className="mx-auto max-w-md text-base leading-relaxed text-muted">
                    {t("finishSuccessBody", {
                      imported: importSummary.imported.toLocaleString(),
                      skipped: importSummary.skippedDuplicates.toLocaleString(),
                    })}
                  </p>
                </div>
                <p className="sr-only">
                  {t("finishAfterImport", {
                    imported: importSummary.imported,
                    skipped: importSummary.skippedDuplicates,
                  })}
                </p>
                <button
                  type="button"
                  className={`${welcomeContinueBtn} mx-auto disabled:pointer-events-none disabled:opacity-60`}
                  onClick={() => void completeOnboarding("/dashboard/musical-profile")}
                  disabled={isSubmitting}
                >
                  <span>{isSubmitting ? t("finishing") : t("goToMusicalProfile")}</span>
                  {!isSubmitting ? (
                    <ArrowRight
                      className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden
                    />
                  )}
                </button>
              </div>
            </OnboardingShell>
        ) : (
        <div className="space-y-6">
            <OnboardingShell>
              <div className="space-y-4">
                <p className="text-sm font-medium text-muted">{t("finishSkippedEyebrow")}</p>
                <DashboardHeroTitle icon={Music2} variant="onboarding" className="!mt-0">
                  {t("finishTitle")}
                </DashboardHeroTitle>
                <p className="text-base leading-relaxed text-muted">{t("finishBody")}</p>
              </div>
            </OnboardingShell>

          <div className={`${surfaceShellClass} space-y-6`}>
          {genreLlmAfterImport &&
          genreLlmAfterImport.unknownTrackCount > 0 &&
          !genreBackfillJob?.id &&
          !genreLlmDeclined &&
          !hasActiveGroqJobShared ? (
            <section aria-labelledby="onboarding-genre-llm-consent-heading">
              <GenreAiPanelChrome className="p-5 sm:p-6">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3 sm:gap-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.12)] ring-1 ring-primary/25 dark:bg-primary/20"
                        aria-hidden
                      >
                        <Sparkles className="h-5 w-5 text-accent-cyan" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <h3
                          id="onboarding-genre-llm-consent-heading"
                          className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem]"
                        >
                          {t("genreLlmConsent.title")}
                        </h3>
                        <p className="text-sm leading-relaxed text-muted">
                          {t("genreLlmConsent.body", {
                            unknown: genreLlmAfterImport.unknownTrackCount,
                            pct: genreLlmAfterImport.unknownRatio.toFixed(1),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!genreLlmAfterImport.groqConfigured ? (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-500/[0.1] px-4 py-3 text-sm font-medium leading-snug text-amber-950 shadow-inner dark:text-amber-50">
                      {t("genreLlmConsent.missingKey")}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-card-border bg-surface px-4 py-3 text-xs leading-relaxed text-muted shadow-inner dark:bg-surface-raised/80">
                      {t("genreLlmConsent.privacy")}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 pt-1 lg:flex-row lg:flex-wrap lg:items-stretch">
                    <button
                      type="button"
                      className={`${GENRE_AI_ACCEPT_BTN} sm:flex-1`}
                      disabled={
                        !genreLlmAfterImport.groqConfigured ||
                        isStartingLlmBackfill ||
                        hasActiveGroqJobShared
                      }
                      onClick={() => void startLlmGenreBackfill()}
                    >
                      {isStartingLlmBackfill ? (
                        <>
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                          <span>{t("genreLlmConsent.starting")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 group-hover:scale-105" aria-hidden />
                          <span>{t("genreLlmConsent.accept")}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`${GENRE_AI_DECLINE_BTN} sm:flex-1`}
                      disabled={isStartingLlmBackfill}
                      onClick={() => {
                        setGenreLlmDeclined(true);
                        setGenreBackfillBannerOptOut(true);
                      }}
                    >
                      {t("genreLlmConsent.decline")}
                    </button>
                  </div>
                </div>
              </GenreAiPanelChrome>
            </section>
          ) : null}
          {effectiveBackfill ? (
            <section aria-label={t("genreBackfill.title")}>
              <GenreAiPanelChrome className="p-5 sm:p-6">
                <div className="space-y-5">
                  <div className="flex gap-3 sm:gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/14 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.08)] ring-1 ring-primary/25 dark:bg-primary/20"
                      aria-hidden
                    >
                      {hasBackfillInProgress ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-accent-cyan" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem]">
                        {t("genreBackfill.title")}
                      </p>
                      <p className="text-xs leading-relaxed text-muted sm:text-sm">
                        {hasBackfillInProgress
                          ? effectiveBackfill.status === "paused"
                            ? t("genreBackfill.paused")
                            : t("genreBackfill.running")
                          : effectiveBackfill.status === "completed"
                            ? t("genreBackfill.completed")
                            : effectiveBackfill.status === "cancelled"
                              ? t("genreBackfill.cancelled")
                              : t("genreBackfill.failed")}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/25 ring-1 ring-inset ring-border dark:bg-white/[0.08] dark:ring-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${ONBOARDING_RAIL_CLASS} shadow-glow transition-[width] duration-500 ease-out`}
                      style={{ width: `${Math.round(backfillProgressRatio * 100)}%` }}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-accent-emerald/28 bg-accent-emerald/[0.08] px-4 py-3 shadow-inner dark:bg-accent-emerald/[0.11]">
                      <p className="text-xs font-medium text-accent-emerald">
                        {t("genreBackfill.artistsProcessed", { count: effectiveBackfill.artistsProcessed })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-primary/28 bg-primary/[0.08] px-4 py-3 shadow-inner dark:bg-primary/[0.12]">
                      <p className="text-xs font-medium text-primary">
                        {t("genreBackfill.artistsMapped", { count: effectiveBackfill.artistsMapped })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-accent-cyan/28 bg-accent-cyan/[0.07] px-4 py-3 shadow-inner dark:bg-accent-cyan/[0.1]">
                      <p className="text-xs font-medium text-accent-cyan">
                        {t("genreBackfill.tracksUpdated", { count: effectiveBackfill.tracksUpdated })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/12 px-4 py-3 shadow-inner dark:bg-white/[0.04]">
                      <p className="text-xs font-medium text-muted">
                        {t("genreBackfill.requestsUsed", { count: effectiveBackfill.apiRequestsUsed })}
                      </p>
                    </div>
                  </div>
                  {effectiveBackfill.initialUnknownPct != null &&
                  effectiveBackfill.currentUnknownPct != null ? (
                    <p className="text-xs leading-relaxed text-muted">
                      {t("genreBackfill.ratio", {
                        initial: effectiveBackfill.initialUnknownPct.toFixed(1),
                        current: effectiveBackfill.currentUnknownPct.toFixed(1),
                        target: effectiveBackfill.targetUnknownPct.toFixed(1),
                      })}
                    </p>
                  ) : null}
                  {effectiveBackfill.errorMessage ? (
                    <p className="rounded-xl border border-accent-rose/40 bg-accent-rose/[0.1] px-4 py-3 text-xs leading-relaxed text-foreground dark:bg-accent-rose/[0.12] dark:text-foreground">
                      {t("genreBackfill.error", { message: effectiveBackfill.errorMessage })}
                    </p>
                  ) : null}
                  {shouldOfferNextLlmSession || shouldOfferRetryLlmSession ? (
                    <div className="space-y-3 rounded-xl border border-card-border bg-surface px-4 py-4 shadow-inner ring-1 ring-primary/10 dark:bg-surface-raised/60">
                      <p className="text-sm leading-relaxed text-muted">
                        {shouldOfferRetryLlmSession
                          ? t("genreLlmConsent.nextSessionAfterError")
                          : t("genreLlmConsent.nextSessionPrompt", {
                              current: effectiveBackfill.currentUnknownPct?.toFixed(1) ?? "0.0",
                              target: effectiveBackfill.targetUnknownPct.toFixed(1),
                            })}
                      </p>
                      <button
                        type="button"
                        className={`${GENRE_AI_ACCEPT_BTN} w-full sm:w-auto`}
                        disabled={isStartingLlmBackfill || hasActiveGroqJobShared}
                        onClick={() => void startLlmGenreBackfill()}
                      >
                        {isStartingLlmBackfill ? (
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
          <div
            className={
              finishSurfaceHasExtras
                ? "flex flex-col gap-3 border-t border-card-border pt-6"
                : "flex flex-col gap-3 pt-2"
            }
          >
            <button
              type="button"
              className={`${welcomeContinueBtn} disabled:pointer-events-none disabled:opacity-60`}
              onClick={() => void completeOnboarding()}
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? t("finishing") : t("goToDashboard")}</span>
              {!isSubmitting ? (
                <ArrowRight
                  className="h-[1.125rem] w-[1.125rem] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              ) : (
                <span
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden
                />
              )}
            </button>
            {paletteInvitation?.shouldInvite ? (
              <button
                type="button"
                className={`${secondaryBtn} inline-flex w-full items-center justify-center gap-2 sm:w-auto sm:self-center`}
                onClick={() => void completeOnboarding("/dashboard/genres/palette")}
                disabled={isSubmitting}
              >
                <Palette className="h-4 w-4 shrink-0 text-primary opacity-90" aria-hidden />
                <span>
                  {t("finishPaletteCta", { count: paletteInvitation.unknownArtists })}
                </span>
              </button>
            ) : null}
          </div>
          </div>
        </div>
        )
      )}
    </div>
  );
}
