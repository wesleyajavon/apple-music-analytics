"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";

type InteractiveAiGenreBackfillNoticeProps = {
  className?: string;
  /** When set, show the notice even if local job status has not updated yet (e.g. HTTP 423). */
  force?: boolean;
};

/**
 * Shown when interactive AI is paused because Groq genre classification is active (pending/running).
 */
export function InteractiveAiGenreBackfillNotice({
  className = "",
  force = false,
}: InteractiveAiGenreBackfillNoticeProps) {
  const t = useTranslations("dashboard.interactiveAi");
  const blocked = useInteractiveAiBlockedByGenreBackfill();
  if (!force && !blocked) return null;

  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50/98 to-white px-4 py-3 text-sm text-slate-800 shadow-sm ring-1 ring-slate-900/[0.03] dark:border-white/10 dark:from-slate-950/45 dark:to-slate-950/22 dark:text-slate-100 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.07),transparent_45%)]"
        aria-hidden
      />
      <div className="relative">
        <p className="font-semibold leading-snug text-slate-900 dark:text-white">{t("title")}</p>
        <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
          {t("body")}
        </p>
        <p className="mt-2 leading-relaxed text-slate-600/95 dark:text-slate-400">
          {t("pauseHint")}
        </p>
        <Link
          href="#genre-backfill-global-badge-panel"
          className="mt-3 inline-flex text-sm font-medium text-violet-600 underline decoration-violet-300/50 underline-offset-2 hover:text-violet-800 dark:text-violet-300 dark:decoration-violet-400/45 dark:hover:text-white"
        >
          {t("openProgressCta")}
        </Link>
      </div>
    </div>
  );
}
