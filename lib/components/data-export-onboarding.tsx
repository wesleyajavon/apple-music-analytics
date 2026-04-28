"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import { extractSpotifyStreamingHistoryJsonTextsFromZip } from "@/lib/services/listening/extract-spotify-export-zip";
import { ONBOARDING_IMPORT_MAX_JSON_BATCH_ROWS } from "@/lib/services/listening/onboarding-import-constants";
import type { NormalizedListenInput } from "@/lib/services/listening/onboarding-import-types";
import { parseApplePlayHistoryDailyTracksCsv } from "@/lib/services/listening/parse-apple-play-history-daily-csv";
import { parseSpotifyStreamingHistoryAudioJson } from "@/lib/services/listening/parse-spotify-streaming-history-json";
import {
  clearGenreBackfillBannerBlockingPrefs,
  setGenreBackfillBannerOptOut,
} from "@/lib/utils/genre-backfill-banner-prefs";

type Phase = "welcome" | "pick" | "guide" | "import" | "finish";
type MusicProvider = "spotify" | "apple";

type GuideStep = {
  titleKey: "step1Title" | "step2Title" | "step3Title" | "step4Title";
  bodyKey: "step1Body" | "step2Body" | "step3Body" | "step4Body";
  imageSrc: string;
  altKey:
    | "imageAltSpotifyStep1"
    | "imageAltSpotifyStep2"
    | "imageAltAppleStep1"
    | "imageAltAppleStep2"
    | "imageAltAppleStep3"
    | "imageAltAppleStep4";
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
];

/** En dessous de ~4,5 Mo (plafond Vercel sur le corps des requêtes), l’upload multipart classique suffit. */
const VERCEL_SAFE_MULTIPART_MAX_BYTES = 4 * 1024 * 1024;
const MAX_ONBOARDING_PARSED_ROWS = 75_000;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function listensToJsonRows(rows: NormalizedListenInput[]) {
  return rows.map((r) => ({
    artistName: r.artistName,
    trackName: r.trackName,
    playedAt: r.playedAt.toISOString(),
  }));
}

export function DataExportOnboarding() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("welcome");
  const [provider, setProvider] = useState<MusicProvider | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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

  const steps = useMemo(() => {
    if (provider === "spotify") return SPOTIFY_STEPS;
    if (provider === "apple") return APPLE_STEPS;
    return [];
  }, [provider]);

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
    if (phase !== "finish" || !genreBackfillJob?.id) return;
    void refreshGenreBackfillStatus();
    const intervalId = window.setInterval(() => {
      void refreshGenreBackfillStatus();
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [phase, genreBackfillJob?.id, refreshGenreBackfillStatus]);

  const completeOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/onboarding/complete", { method: "POST" });
      if (!res.ok) throw new Error("complete_failed");
      router.push("/dashboard/overview");
    } catch {
      toast.error(t("completeError"));
    } finally {
      setIsSubmitting(false);
    }
  }, [router, t]);

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
  }

  const submitImport = useCallback(async () => {
    if (!provider || !importFile) {
      toast.error(t("import.noFile"));
      return;
    }
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
      }
    } catch {
      toast.error(t("genreLlmConsent.startError"));
    } finally {
      setIsStartingLlmBackfill(false);
    }
  }, [t]);

  const cardClass =
    "mx-auto w-full max-w-3xl rounded-2xl border border-gray-200/90 bg-white/95 p-6 shadow-lg shadow-gray-200/30 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-none sm:p-8";

  const primaryBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent-violet px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-violet/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

  const secondaryBtn =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900";
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

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <div className={cardClass}>
        {phase === "welcome" && (
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("welcomeEyebrow")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {t("welcomeTitle")}
            </h1>
            <section
              className="rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/25 dark:text-sky-100"
              aria-labelledby="onboarding-why-not-api-heading"
            >
              <h2
                id="onboarding-why-not-api-heading"
                className="text-base font-semibold text-sky-950 dark:text-sky-50"
              >
                {t("whyNotApiTitle")}
              </h2>
              <p className="mt-2 text-sky-900/95 dark:text-sky-100/95">{t("whyNotApiBody")}</p>
            </section>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {t("welcomeBody")}
            </p>
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <strong className="font-semibold">{t("welcomeNoteStrong")}</strong>
              {t("welcomeNoteRest")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button type="button" className={primaryBtn} onClick={() => setPhase("pick")}>
                {t("continue")}
              </button>
              <button
                type="button"
                className={`${secondaryBtn} text-gray-600 dark:text-gray-400`}
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                {t("skipForNow")}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("skipHint")}</p>
          </div>
        )}

        {phase === "pick" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                {t("pickTitle")}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("pickSubtitle")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectProvider("spotify")}
                className="group flex flex-col items-start rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-[#1DB954]/10 to-transparent p-6 text-left transition-all hover:border-[#1DB954]/60 hover:shadow-md dark:border-gray-700 dark:from-[#1DB954]/15 dark:hover:border-[#1DB954]/50"
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">{t("pickSpotify")}</span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("pickSpotifyHint")}</span>
                <span className="mt-4 text-sm font-semibold text-[#169c46] group-hover:underline dark:text-[#1ed760]">
                  {t("continue")} →
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectProvider("apple")}
                className="group flex flex-col items-start rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-100/80 to-transparent p-6 text-left transition-all hover:border-gray-400 hover:shadow-md dark:border-gray-700 dark:from-gray-800/50 dark:hover:border-gray-500"
              >
                <span className="text-lg font-bold text-gray-900 dark:text-white">{t("pickApple")}</span>
                <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t("pickAppleHint")}</span>
                <span className="mt-4 text-sm font-semibold text-accent-violet group-hover:underline">
                  {t("continue")} →
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className={secondaryBtn} onClick={() => setPhase("welcome")}>
                {t("back")}
              </button>
              <button
                type="button"
                className="text-sm font-medium text-gray-500 underline-offset-4 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => void completeOnboarding()}
                disabled={isSubmitting}
              >
                {t("skipForNow")}
              </button>
            </div>
          </div>
        )}

        {phase === "guide" && provider && steps[stepIndex] && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400" aria-live="polite">
                {t("stepProgress", { current: stepIndex + 1, total: steps.length })}
              </p>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              {t(`${provider}.${steps[stepIndex].titleKey}` as Parameters<typeof t>[0])}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {t(`${provider}.${steps[stepIndex].bodyKey}` as Parameters<typeof t>[0])}
            </p>

            <a
              href={provider === "spotify" ? spotifyPrivacyUrl : applePrivacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryBtn}
              aria-label={`${provider === "spotify" ? t("openSpotifyPrivacy") : t("openApplePrivacy")} (${t("externalLinkAria")})`}
            >
              {provider === "spotify" ? t("openSpotifyPrivacy") : t("openApplePrivacy")} ↗
            </a>

            <figure className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/50">
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

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:justify-between">
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
            className={`relative space-y-6 ${isImporting ? "min-h-[22rem] sm:min-h-[26rem]" : ""}`}
          >
            {isImporting ? (
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/92 px-6 py-8 text-center shadow-inner backdrop-blur-sm dark:bg-gray-950/92"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="relative mb-1">
                  <div
                    className="h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-t-accent-violet dark:border-gray-700 dark:border-t-accent-violet"
                    aria-hidden
                  />
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {t("import.importingOverlayTitle")}
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {t("import.importingOverlayHint")}
                </p>
                {importFile ? (
                  <p
                    className="mt-1 max-w-full truncate px-2 text-xs font-medium text-accent-violet dark:text-violet-300"
                    title={importFile.name}
                  >
                    {importFile.name}
                  </p>
                ) : null}
                <div
                  className="mt-4 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                  aria-hidden
                >
                  <div className="h-full w-1/3 rounded-full bg-accent-violet shadow-sm shadow-accent-violet/40 animate-onboarding-import-indeterminate" />
                </div>
              </div>
            ) : null}

            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t("import.eyebrow")}
            </p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              {provider === "spotify" ? t("import.spotifyTitle") : t("import.appleTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {provider === "spotify" ? t("import.spotifyBody") : t("import.appleBody")}
            </p>

            {provider === "spotify" && (
              <figure className="overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/50">
                <Image
                  src="/onboarding/spotify-email-download.png"
                  alt={t("imageAltSpotifyEmail")}
                  width={1280}
                  height={720}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 768px) 100vw, 42rem"
                />
              </figure>
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
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-10 text-center text-sm text-gray-700 transition-colors hover:border-accent-violet/50 hover:bg-violet-50/40 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-950/40 dark:text-gray-200 dark:hover:border-accent-violet/40"
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
              <span className="font-semibold text-gray-900 dark:text-white">{t("import.dropTitle")}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t("import.dropSub")}</span>
              {importFile ? (
                <span className="mt-1 text-xs font-medium text-accent-violet">
                  {t("import.selectedFile", { name: importFile.name })}
                </span>
              ) : null}
            </button>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:justify-between">
              <button
                type="button"
                className={secondaryBtn}
                onClick={goBackImport}
                disabled={isImporting}
              >
                {t("back")}
              </button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className={`${secondaryBtn} text-gray-600 dark:text-gray-400`}
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
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{t("finishTitle")}</h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {importSummary
                ? t("finishAfterImport", {
                    imported: importSummary.imported,
                    skipped: importSummary.skippedDuplicates,
                  })
                : t("finishBody")}
            </p>
            {genreLlmAfterImport &&
            genreLlmAfterImport.unknownTrackCount > 0 &&
            !genreBackfillJob?.id &&
            !genreLlmDeclined ? (
              <section
                className="space-y-3 rounded-xl border border-sky-200/80 bg-sky-50/80 p-4 dark:border-sky-900/50 dark:bg-sky-950/30"
                aria-labelledby="onboarding-genre-llm-consent-heading"
              >
                <h3
                  id="onboarding-genre-llm-consent-heading"
                  className="text-sm font-semibold text-sky-950 dark:text-sky-50"
                >
                  {t("genreLlmConsent.title")}
                </h3>
                <p className="text-xs leading-relaxed text-sky-900/95 dark:text-sky-100/90">
                  {t("genreLlmConsent.body", {
                    unknown: genreLlmAfterImport.unknownTrackCount,
                    pct: genreLlmAfterImport.unknownRatio.toFixed(1),
                  })}
                </p>
                {!genreLlmAfterImport.groqConfigured ? (
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    {t("genreLlmConsent.missingKey")}
                  </p>
                ) : (
                  <p className="text-xs text-sky-900/90 dark:text-sky-100/85">{t("genreLlmConsent.privacy")}</p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    className={primaryBtn}
                    disabled={!genreLlmAfterImport.groqConfigured || isStartingLlmBackfill}
                    onClick={() => void startLlmGenreBackfill()}
                  >
                    {isStartingLlmBackfill ? t("genreLlmConsent.starting") : t("genreLlmConsent.accept")}
                  </button>
                  <button
                    type="button"
                    className={secondaryBtn}
                    disabled={isStartingLlmBackfill}
                    onClick={() => {
                      setGenreLlmDeclined(true);
                      setGenreBackfillBannerOptOut(true);
                    }}
                  >
                    {t("genreLlmConsent.decline")}
                  </button>
                </div>
              </section>
            ) : null}
            {effectiveBackfill ? (
              <section className="space-y-3 rounded-xl border border-violet-200/80 bg-violet-50/70 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                  {t("genreBackfill.title")}
                </p>
                <p className="text-xs text-violet-800/90 dark:text-violet-200/90">
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-violet-200/70 dark:bg-violet-900/60">
                  <div
                    className="h-full rounded-full bg-accent-violet transition-all"
                    style={{ width: `${Math.round(backfillProgressRatio * 100)}%` }}
                  />
                </div>
                <div className="grid gap-2 text-xs text-violet-900 dark:text-violet-100 sm:grid-cols-2">
                  <p>{t("genreBackfill.artistsProcessed", { count: effectiveBackfill.artistsProcessed })}</p>
                  <p>{t("genreBackfill.artistsMapped", { count: effectiveBackfill.artistsMapped })}</p>
                  <p>{t("genreBackfill.tracksUpdated", { count: effectiveBackfill.tracksUpdated })}</p>
                  <p>{t("genreBackfill.requestsUsed", { count: effectiveBackfill.apiRequestsUsed })}</p>
                </div>
                {effectiveBackfill.initialUnknownPct != null &&
                effectiveBackfill.currentUnknownPct != null ? (
                  <p className="text-xs text-violet-900/90 dark:text-violet-100/90">
                    {t("genreBackfill.ratio", {
                      initial: effectiveBackfill.initialUnknownPct.toFixed(1),
                      current: effectiveBackfill.currentUnknownPct.toFixed(1),
                      target: effectiveBackfill.targetUnknownPct.toFixed(1),
                    })}
                  </p>
                ) : null}
                {effectiveBackfill.errorMessage ? (
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {t("genreBackfill.error", { message: effectiveBackfill.errorMessage })}
                  </p>
                ) : null}
                {shouldOfferNextLlmSession || shouldOfferRetryLlmSession ? (
                  <div className="space-y-2 rounded-lg border border-violet-300/70 bg-white/70 p-3 dark:border-violet-700/60 dark:bg-violet-950/20">
                    <p className="text-xs text-violet-900 dark:text-violet-100">
                      {shouldOfferRetryLlmSession
                        ? t("genreLlmConsent.nextSessionAfterError")
                        : t("genreLlmConsent.nextSessionPrompt", {
                            current: effectiveBackfill.currentUnknownPct?.toFixed(1) ?? "0.0",
                            target: effectiveBackfill.targetUnknownPct.toFixed(1),
                          })}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        className={primaryBtn}
                        disabled={isStartingLlmBackfill}
                        onClick={() => void startLlmGenreBackfill()}
                      >
                        {isStartingLlmBackfill
                          ? t("genreLlmConsent.starting")
                          : t("genreLlmConsent.startNextSession")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}
            <button
              type="button"
              className={primaryBtn}
              onClick={() => void completeOnboarding()}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("finishing") : t("goToDashboard")}
            </button>
            {paletteInvitation?.shouldInvite ? (
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => router.push("/dashboard/genres/palette")}
                disabled={isSubmitting}
              >
                Palette ({paletteInvitation.unknownArtists})
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
