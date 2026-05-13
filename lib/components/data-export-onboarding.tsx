"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Music2,
  Palette,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { DashboardHeroTitle } from "@/lib/components/dashboard-hero-title";
import { useGenreBackfillJobSafe } from "@/lib/context/genre-backfill-job-context";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import { extractSpotifyStreamingHistoryJsonTextsFromZip } from "@/lib/services/listening/extract-spotify-export-zip";
import { ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS } from "@/lib/services/listening/onboarding-import-constants";
import type { NormalizedListenInput } from "@/lib/services/listening/onboarding-import-types";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";
import { parseSpotifyStreamingHistoryAudioJson } from "@/lib/services/listening/parse-spotify-streaming-history-json";
import { isGroqGenreNudgeEligible } from "@/lib/utils/genre-ai-nudge-eligibility";
import {
  clearGenreBackfillBannerBlockingPrefs,
  setGenreBackfillBannerOptOut,
} from "@/lib/utils/genre-backfill-banner-prefs";

type Phase = "welcome" | "pick" | "guide" | "import" | "finish";
type MusicProvider = "spotify" | "apple";

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
const MAX_ONBOARDING_PARSED_ROWS = 75_000;

/** Aligné sur le hero « Overview » (violet / cyan). */
const ONBOARDING_RAIL_CLASS = "bg-gradient-to-r from-violet-400 via-indigo-500 to-cyan-400";
const ONBOARDING_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-violet-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.2),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#2e1065_100%)] px-6 py-8 shadow-2xl shadow-violet-950/40 sm:px-8 sm:py-10";

function OnboardingHeroShell({ children }: { children: ReactNode }) {
  return (
    <div className={ONBOARDING_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(34,211,238,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-400/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ONBOARDING_RAIL_CLASS} opacity-90`} />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Carte « genres IA » — même langage que le hero (violet / cyan). */
const GENRE_AI_SURFACE =
  "relative overflow-hidden rounded-2xl border border-violet-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.12),_transparent_40%),linear-gradient(145deg,_rgb(15_23_42_/_0.94)_0%,_rgb(49_46_129_/_0.38)_100%)] shadow-lg shadow-violet-950/30 ring-1 ring-white/[0.06]";

const GENRE_AI_ACCEPT_BTN =
  "group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:min-w-[min(100%,260px)]";

const GENRE_AI_DECLINE_BTN =
  "inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/[0.07] px-5 py-3 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.08)] backdrop-blur-sm transition-all hover:border-white/28 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto sm:min-w-[min(100%,200px)]";

function GenreAiPanelChrome({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${GENRE_AI_SURFACE} ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.07)_1px,_transparent_1px),linear-gradient(90deg,_rgba(34,211,238,0.05)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-[0.38]" />
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
      ? "bg-white/[0.12] ring-1 ring-inset ring-white/[0.06]"
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
        className={`h-full rounded-full ${ONBOARDING_RAIL_CLASS} shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-[width] duration-500 ease-out`}
        style={{ width: `${percent}%` }}
      />
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
        router.refresh();
        router.replace(nextPath);
      } catch {
        toast.error(t("completeError"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, t],
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
    }
  }, [t, router]);

  const submitImport = useCallback(async () => {
    if (!provider || !importFile) {
      toast.error(t("import.noFile"));
      return;
    }
    setImportOverlayKind("file");
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
        const buf = await importFile.arrayBuffer();
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
        const csvText = await importFile.text();
        allRows = parseApplePlayHistoryDailyTracksCsv(csvText);
      }

      if (allRows.length === 0) {
        toast.error(t("import.noParsedListens"));
        return;
      }
      if (allRows.length > MAX_ONBOARDING_PARSED_ROWS) {
        toast.error(t("import.tooManyPlays", { max: MAX_ONBOARDING_PARSED_ROWS.toLocaleString() }));
        return;
      }

      const chunks = chunkArray(allRows, ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS);
      let sumImported = 0;
      let sumSkippedDup = 0;
      let lastPayload: ImportOkJson | null = null;

      for (let i = 0; i < chunks.length; i++) {
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
      }

      if (!lastPayload) {
        toast.error(t("import.importError"));
        return;
      }

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

  const surfaceShellClass =
    "relative mx-auto w-full max-w-4xl rounded-3xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm sm:p-8";

  const primaryBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-card-border bg-surface-raised px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-white/5";

  /** CTA principal onboarding (welcome) — dégradé marque comme la connexion */
  const welcomeContinueBtn =
    "group inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 sm:w-auto";

  /** Passer sans importer — overlay hero sombre */
  const welcomeSkipBtn =
    "inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.08] px-5 py-3 text-sm font-medium text-violet-100 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.12)] backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/[0.14] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-55 sm:w-auto";

  /** Passer depuis l’étape « choix » — surface claire */
  const pickSkipBtn =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent px-5 py-2.5 text-sm font-medium text-muted transition-all hover:border-primary/35 hover:bg-primary/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55";

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
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {phase === "welcome" && (
        <OnboardingHeroShell>
          <div className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/85">
              {t("welcomeEyebrow")}
            </p>
            <DashboardHeroTitle icon={Sparkles} variant="hero">
              {t("welcomeTitle")}
            </DashboardHeroTitle>
            <OnboardingFlowProgressBar
              percent={flowProgressPercent}
              variant="hero"
              ariaLabel={flowProgressAria}
            />
            <section
              className="rounded-xl border border-violet-200/15 bg-slate-950/40 px-4 py-4 text-sm leading-relaxed backdrop-blur-sm"
              aria-labelledby="onboarding-why-not-api-heading"
            >
              <h2
                id="onboarding-why-not-api-heading"
                className="text-base font-semibold text-white"
              >
                {t("whyNotApiTitle")}
              </h2>
              <p className="mt-2 text-violet-100/90">{t("whyNotApiBody")}</p>
            </section>
            <p className="text-base leading-relaxed text-violet-100/92 sm:text-lg">{t("welcomeBody")}</p>
            <p className="rounded-xl border border-amber-400/35 bg-amber-500/[0.12] px-4 py-3 text-sm leading-relaxed text-amber-50 backdrop-blur-sm">
              <strong className="font-semibold text-amber-100">{t("welcomeNoteStrong")}</strong>
              {t("welcomeNoteRest")}
            </p>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
              <button type="button" className={welcomeContinueBtn} onClick={() => setPhase("pick")}>
                <span>{t("continue")}</span>
                <ArrowRight
                  className="h-[1.125rem] w-[1.125rem] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
              <button
                type="button"
                className={welcomeSkipBtn}
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                <SkipForward className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-90" aria-hidden />
                <span>{t("skipForNow")}</span>
              </button>
            </div>
            <p className="text-xs text-violet-300/85">{t("skipHint")}</p>
          </div>
        </OnboardingHeroShell>
      )}

      {phase === "pick" && (
        <>
          <OnboardingHeroShell>
            <div className="max-w-3xl">
              <DashboardHeroTitle icon={Music2} variant="hero">
                {t("pickTitle")}
              </DashboardHeroTitle>
              <div className="mt-5">
                <OnboardingFlowProgressBar
                  percent={flowProgressPercent}
                  variant="hero"
                  ariaLabel={flowProgressAria}
                />
              </div>
              <p className="mt-5 text-base leading-relaxed text-violet-100/90">{t("pickSubtitle")}</p>
            </div>
          </OnboardingHeroShell>

          <div className={`${surfaceShellClass} space-y-8`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectProvider("spotify")}
                className="group flex flex-col items-start rounded-2xl border border-card-border bg-gradient-to-br from-[#1DB954]/14 to-transparent p-6 text-left shadow-card ring-1 ring-[#1DB954]/25 transition-all hover:border-[#1DB954]/55 hover:shadow-brand-glow dark:from-[#1DB954]/18 dark:hover:border-[#1DB954]/50"
              >
                <span className="text-lg font-bold text-foreground">{t("pickSpotify")}</span>
                <span className="mt-1 text-sm text-muted">{t("pickSpotifyHint")}</span>
                <span className="mt-4 text-sm font-semibold text-[#169c46] group-hover:underline dark:text-[#1ed760]">
                  {t("continue")} →
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectProvider("apple")}
                className="group flex flex-col items-start rounded-2xl border border-card-border bg-gradient-to-br from-accent-violet/10 via-transparent to-accent-cyan/10 p-6 text-left shadow-card ring-1 ring-primary/15 transition-all hover:border-primary/40 hover:shadow-brand-glow"
              >
                <span className="text-lg font-bold text-foreground">{t("pickApple")}</span>
                <span className="mt-1 text-sm text-muted">{t("pickAppleHint")}</span>
                <span className="mt-4 text-sm font-semibold text-accent-violet group-hover:underline">
                  {t("continue")} →
                </span>
              </button>
            </div>

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
                <SkipForward className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-80" aria-hidden />
                <span>{t("skipForNow")}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {phase === "guide" && provider && steps[stepIndex] && (
        <div className={`${surfaceShellClass} space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary" aria-live="polite">
              {t("stepProgress", { current: stepIndex + 1, total: steps.length })}
            </p>
          </div>
          <OnboardingFlowProgressBar
            percent={flowProgressPercent}
            variant="surface"
            ariaLabel={flowProgressAria}
          />

          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t(`${provider}.${steps[stepIndex].titleKey}` as Parameters<typeof t>[0])}
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            {t(`${provider}.${steps[stepIndex].bodyKey}` as Parameters<typeof t>[0])}
          </p>

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
            <figure className="overflow-hidden rounded-xl border border-card-border bg-surface shadow-inner">
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
              <figure className="overflow-hidden rounded-xl border border-card-border bg-surface shadow-inner">
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

          <div className="flex flex-col-reverse gap-3 border-t border-card-border pt-6 sm:flex-row sm:justify-between">
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
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl bg-surface-glass px-6 py-8 text-center shadow-inner backdrop-blur-md"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="relative mb-1">
                <div
                  className="h-14 w-14 animate-spin rounded-full border-4 border-border border-t-accent-violet"
                  aria-hidden
                />
              </div>
              <p className="text-base font-semibold text-foreground">
                {importOverlayKind === "spotify_web"
                  ? t("import.importingOverlayTitleWebApi")
                  : t("import.importingOverlayTitle")}
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-muted">
                {importOverlayKind === "spotify_web"
                  ? t("import.importingOverlayHintWebApi")
                  : t("import.importingOverlayHint")}
              </p>
              {importOverlayKind === "file" && importFile ? (
                <p
                  className="mt-1 max-w-full truncate px-2 text-xs font-medium text-accent-violet"
                  title={importFile.name}
                >
                  {importFile.name}
                </p>
              ) : null}
              <div
                className="mt-4 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-border"
                aria-hidden
              >
                <div className="h-full w-1/3 rounded-full bg-accent-violet shadow-glow animate-onboarding-import-indeterminate" />
              </div>
            </div>
          ) : null}

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("import.eyebrow", { step: steps.length + 1 })}
          </p>
          <OnboardingFlowProgressBar
            percent={flowProgressPercent}
            variant="surface"
            ariaLabel={flowProgressAria}
          />
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {provider === "spotify" ? t("import.spotifyTitle") : t("import.appleTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            {provider === "spotify" ? t("import.spotifyBody") : t("import.appleBody")}
          </p>

          {provider === "spotify" && hasSpotifyWebConnection ? (
            <div className="space-y-4 rounded-2xl border border-[#1DB954]/35 bg-[#1DB954]/[0.07] p-5 shadow-inner ring-1 ring-[#1DB954]/20 dark:ring-[#1DB954]/25">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#169c46] dark:text-[#1ed760]">
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
              className={`${secondaryBtn} w-fit`}
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
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-card-border bg-surface px-4 py-10 text-center text-sm text-foreground transition-colors hover:border-accent-violet/40 hover:bg-accent-violet/5 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-accent-violet/10"
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
            <span className="font-semibold text-foreground">{t("import.dropTitle")}</span>
            <span className="text-xs text-muted">
              {provider === "spotify" ? t("import.dropSubSpotify") : t("import.dropSubApple")}
            </span>
            {importFile ? (
              <span className="mt-1 text-xs font-medium text-accent-violet">
                {t("import.selectedFile", { name: importFile.name })}
              </span>
            ) : null}
          </button>

          <div className="flex flex-col-reverse gap-3 border-t border-card-border pt-6 sm:flex-row sm:justify-between">
            <button type="button" className={secondaryBtn} onClick={goBackImport} disabled={isImporting}>
              {t("back")}
            </button>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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

      {phase === "finish" && (
        <div className="space-y-8">
          {importSummary ? (
            <OnboardingHeroShell>
              <div className="max-w-3xl space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/90">
                  {t("finishSuccessEyebrow")}
                </p>
                <DashboardHeroTitle icon={CheckCircle2} variant="hero">
                  {t("finishTitle")}
                </DashboardHeroTitle>
                <OnboardingFlowProgressBar
                  percent={flowProgressPercent}
                  variant="hero"
                  ariaLabel={flowProgressAria}
                />
                <p className="sr-only">
                  {t("finishAfterImport", {
                    imported: importSummary.imported,
                    skipped: importSummary.skippedDuplicates,
                  })}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.12] px-5 py-4 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)] backdrop-blur-sm">
                    <p className="text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
                      {importSummary.imported.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm font-medium text-emerald-100/90">{t("finishImportedLabel")}</p>
                  </div>
                  <div className="rounded-2xl border border-violet-200/20 bg-slate-950/45 px-5 py-4 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.05)] backdrop-blur-sm">
                    <p className="text-3xl font-bold tabular-nums tracking-tight text-violet-50 sm:text-4xl">
                      {importSummary.skippedDuplicates.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm font-medium text-violet-100/85">{t("finishSkippedLabel")}</p>
                  </div>
                </div>
                <p className="text-base leading-relaxed text-violet-100/90 sm:text-[1.05rem]">{t("finishNextHint")}</p>
              </div>
            </OnboardingHeroShell>
          ) : (
            <OnboardingHeroShell>
              <div className="max-w-3xl space-y-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/85">
                  {t("finishSkippedEyebrow")}
                </p>
                <DashboardHeroTitle icon={Sparkles} variant="hero">
                  {t("finishTitle")}
                </DashboardHeroTitle>
                <OnboardingFlowProgressBar
                  percent={flowProgressPercent}
                  variant="hero"
                  ariaLabel={flowProgressAria}
                />
                <p className="text-base leading-relaxed text-violet-100/92 sm:text-lg">{t("finishBody")}</p>
              </div>
            </OnboardingHeroShell>
          )}

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
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(139,92,246,0.38),_rgba(34,211,238,0.22))] shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.15)] ring-1 ring-white/15"
                        aria-hidden
                      >
                        <Sparkles className="h-5 w-5 text-cyan-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
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
                    <div className="rounded-xl border border-white/12 bg-black/[0.18] px-4 py-3 text-xs leading-relaxed text-violet-100/85 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
                      {t("genreLlmConsent.privacy")}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-stretch">
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
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(139,92,246,0.38),_rgba(34,211,238,0.22))] shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.15)] ring-1 ring-white/15"
                      aria-hidden
                    >
                      {hasBackfillInProgress ? (
                        <Loader2 className="h-5 w-5 animate-spin text-cyan-50" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-cyan-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem]">
                        {t("genreBackfill.title")}
                      </p>
                      <p className="text-xs leading-relaxed text-violet-100/85 sm:text-sm">
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
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.1] ring-1 ring-inset ring-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${ONBOARDING_RAIL_CLASS} shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-[width] duration-500 ease-out`}
                      style={{ width: `${Math.round(backfillProgressRatio * 100)}%` }}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.09] px-4 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
                      <p className="text-xs font-medium text-emerald-100/90">
                        {t("genreBackfill.artistsProcessed", { count: effectiveBackfill.artistsProcessed })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-violet-300/25 bg-violet-500/[0.08] px-4 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
                      <p className="text-xs font-medium text-violet-100/90">
                        {t("genreBackfill.artistsMapped", { count: effectiveBackfill.artistsMapped })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/[0.08] px-4 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
                      <p className="text-xs font-medium text-cyan-100/90">
                        {t("genreBackfill.tracksUpdated", { count: effectiveBackfill.tracksUpdated })}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-black/[0.15] px-4 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.06)]">
                      <p className="text-xs font-medium text-violet-100/85">
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
                    <p className="rounded-xl border border-red-400/35 bg-red-500/[0.12] px-4 py-3 text-xs leading-relaxed text-red-100">
                      {t("genreBackfill.error", { message: effectiveBackfill.errorMessage })}
                    </p>
                  ) : null}
                  {shouldOfferNextLlmSession || shouldOfferRetryLlmSession ? (
                    <div className="space-y-3 rounded-xl border border-violet-300/25 bg-black/[0.2] p-4 shadow-inner ring-1 ring-white/[0.04]">
                      <p className="text-sm leading-relaxed text-violet-50/95">
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
                <Palette className="h-4 w-4 shrink-0 text-accent-violet opacity-90" aria-hidden />
                <span>
                  {t("finishPaletteCta", { count: paletteInvitation.unknownArtists })}
                </span>
              </button>
            ) : null}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
