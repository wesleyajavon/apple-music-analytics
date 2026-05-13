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
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/45 dark:bg-amber-950/35 dark:text-amber-50 ${className}`}
    >
      <p className="font-semibold leading-snug">{t("title")}</p>
      <p className="mt-2 leading-relaxed text-amber-900/90 dark:text-amber-100/90">
        {t("body")}
      </p>
      <p className="mt-2 leading-relaxed text-amber-900/85 dark:text-amber-100/85">
        {t("pauseHint")}
      </p>
      <Link
        href="#genre-backfill-global-badge-panel"
        className="mt-3 inline-flex text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-800 dark:text-amber-100 dark:hover:text-white"
      >
        {t("openProgressCta")}
      </Link>
    </div>
  );
}
