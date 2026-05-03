"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { clearGenreBackfillBannerBlockingPrefs } from "@/lib/utils/genre-backfill-banner-prefs";

type GroqEligibility = {
  unknownTrackCount: number;
  unknownRatio: number;
  totalTrackCount: number;
  groqConfigured: boolean;
};

type GroqJobStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

type GroqGenreBackfillCtaProps = {
  viewerUserId?: string | null;
  className?: string;
  textClassName?: string;
  buttonClassName?: string;
  showPrivacyCopy?: boolean;
};

const DEFAULT_BUTTON_CLASS =
  "group relative inline-flex min-h-[42px] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-brand-gradient px-5 py-2.5 text-xs font-semibold text-white shadow-brand-glow transition-all duration-300 hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60";

export function GroqGenreBackfillCta({
  viewerUserId,
  className = "space-y-2",
  textClassName = "text-xs",
  buttonClassName = DEFAULT_BUTTON_CLASS,
  showPrivacyCopy = true,
}: GroqGenreBackfillCtaProps) {
  const t = useTranslations("genreTrends");
  const tConsent = useTranslations("onboarding.genreLlmConsent");
  const [meta, setMeta] = useState<{
    loaded: boolean;
    eligibility: GroqEligibility | null;
    jobStatus: GroqJobStatus | null;
    errorStatus: number | null;
  }>({ loaded: false, eligibility: null, jobStatus: null, errorStatus: null });
  const [isStarting, setIsStarting] = useState(false);

  const refreshMeta = useCallback(async () => {
    if (viewerUserId) {
      setMeta({ loaded: true, eligibility: null, jobStatus: null, errorStatus: null });
      return;
    }

    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/status?includeEligibility=1", {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        eligibility?: GroqEligibility;
        job?: { status: GroqJobStatus } | null;
      };

      if (!res.ok) {
        setMeta({
          loaded: true,
          eligibility: null,
          jobStatus: null,
          errorStatus: res.status,
        });
        return;
      }

      setMeta({
        loaded: true,
        eligibility: data.eligibility ?? null,
        jobStatus: data.job?.status ?? null,
        errorStatus: null,
      });
    } catch {
      setMeta({ loaded: true, eligibility: null, jobStatus: null, errorStatus: null });
    }
  }, [viewerUserId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshMeta();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMeta]);

  const startBackfill = useCallback(async () => {
    setIsStarting(true);
    try {
      const res = await fetch("/api/user/onboarding/import/genre-backfill/start", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data?.error ?? tConsent("startError"));
        return;
      }

      clearGenreBackfillBannerBlockingPrefs();
      toast.success(tConsent("startedToast"));
      await refreshMeta();
      window.setTimeout(() => {
        document.getElementById("genre-backfill-global-badge-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch {
      toast.error(tConsent("startError"));
    } finally {
      setIsStarting(false);
    }
  }, [refreshMeta, tConsent]);

  if (viewerUserId != null) {
    return (
      <div className={className}>
        <p className={textClassName}>{t("groqUnavailableInViewedProfile")}</p>
      </div>
    );
  }

  if (!meta.loaded) {
    return (
      <div className={className}>
        <p className={textClassName}>{t("groqCheckingEligibility")}</p>
      </div>
    );
  }

  if (meta.errorStatus === 401) {
    return (
      <div className={className}>
        <p className={textClassName}>{t("groqAuthUnavailable")}</p>
      </div>
    );
  }

  if (meta.errorStatus === 403) {
    return (
      <div className={className}>
        <p className={textClassName}>{t("groqRecentAuthRequired")}</p>
      </div>
    );
  }

  if (meta.errorStatus != null) {
    return (
      <div className={className}>
        <p className={textClassName}>
          {t("groqEligibilityRequestFailed", { status: meta.errorStatus })}
        </p>
      </div>
    );
  }

  if (!meta.eligibility) {
    return (
      <div className={className}>
        <p className={textClassName}>{t("groqEligibilityUnavailable")}</p>
      </div>
    );
  }

  if (!meta.eligibility.groqConfigured) {
    return (
      <div className={className}>
        <p className={textClassName}>{tConsent("missingKey")}</p>
      </div>
    );
  }

  if (meta.eligibility.unknownTrackCount === 0) {
    return (
      <div className={className}>
        <p className={textClassName}>{t("groqStartNoUnknown")}</p>
      </div>
    );
  }

  if (
    meta.jobStatus === "pending" ||
    meta.jobStatus === "running" ||
    meta.jobStatus === "paused"
  ) {
    return (
      <div className={className}>
        <p className={textClassName}>
          <span>{t("groqSessionRunningHint")} </span>
          <a
            href="#genre-backfill-global-badge-panel"
            className="font-semibold underline underline-offset-2 hover:opacity-90"
          >
            {t("groqProgressAnchor")}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {showPrivacyCopy ? <p className={textClassName}>{tConsent("privacy")}</p> : null}
      <button
        type="button"
        disabled={isStarting}
        onClick={() => void startBackfill()}
        className={buttonClassName}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.34),_transparent_34%),linear-gradient(120deg,_transparent,_rgba(255,255,255,0.18),_transparent)] opacity-70 transition-opacity group-hover:opacity-100" />
        <span className="relative inline-flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/18 text-[10px] font-black tracking-tight shadow-inner shadow-white/10">
            AI
          </span>
          <span>{isStarting ? tConsent("starting") : tConsent("accept")}</span>
        </span>
      </button>
    </div>
  );
}
