"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Forme renvoyée par GET `/api/user/onboarding/import/genre-backfill/status` (job dashboard). */
export type GroqBackfillDashboardJob = {
  id: string;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  targetUnknownPct: number;
  initialUnknownPct: number | null;
  currentUnknownPct: number | null;
  artistsProcessed: number;
  maxArtists: number;
};

type GenreBackfillJobContextValue = {
  job: GroqBackfillDashboardJob | null;
  /** Au moins un job pending / running / paused : désactive les CTA « démarrer une session ». */
  hasActiveGroqJob: boolean;
  refreshStatus: () => Promise<void>;
};

const GenreBackfillJobContext = createContext<GenreBackfillJobContextValue | null>(null);

const POLL_MS_ACTIVE = 2500;
const POLL_MS_TERMINAL = 60_000;
/** Job actif absent : fréquence raisonnable pour refléter un démarrage depuis une autre zone de l’UI (ex. centre de notifs). */
const POLL_MS_NO_JOB = 5000;

export function GenreBackfillJobProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<GroqBackfillDashboardJob | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshStatus = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status", {
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as {
        job?: GroqBackfillDashboardJob | null;
      };
      setJob(data.job ?? null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const status = job?.status;
    const active = status === "pending" || status === "running" || status === "paused";
    const pollMs =
      active ? POLL_MS_ACTIVE : status == null ? POLL_MS_NO_JOB : POLL_MS_TERMINAL;
    const id = window.setInterval(() => {
      void refreshStatus();
    }, pollMs);
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshStatus();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      abortRef.current?.abort();
    };
  }, [job?.status, refreshStatus]);

  const hasActiveGroqJob = useMemo(
    () =>
      job != null &&
      (job.status === "pending" || job.status === "running" || job.status === "paused"),
    [job]
  );

  const value = useMemo(
    () => ({ job, hasActiveGroqJob, refreshStatus }),
    [job, hasActiveGroqJob, refreshStatus]
  );

  return (
    <GenreBackfillJobContext.Provider value={value}>{children}</GenreBackfillJobContext.Provider>
  );
}

export function useGenreBackfillJob(): GenreBackfillJobContextValue {
  const ctx = useContext(GenreBackfillJobContext);
  if (!ctx) {
    throw new Error("useGenreBackfillJob must be used within GenreBackfillJobProvider");
  }
  return ctx;
}

/** Hors provider (ex. tests) : pas de job partagé. */
export function useGenreBackfillJobSafe(): GenreBackfillJobContextValue | null {
  return useContext(GenreBackfillJobContext);
}
