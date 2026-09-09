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
      className={`border-t border-glass-hairline pt-4 text-[13px] text-foreground ${className}`}
    >
      <p className="font-semibold leading-snug">{t("title")}</p>
      <p className="mt-2 leading-relaxed text-muted">{t("body")}</p>
      <p className="mt-2 leading-relaxed text-muted">{t("pauseHint")}</p>
      <Link
        href="#genre-backfill-global-badge-panel"
        className="mt-3 inline-flex min-h-11 items-center text-[13px] font-medium text-foreground underline decoration-glass-hairline underline-offset-2 hover:decoration-foreground"
      >
        {t("openProgressCta")}
      </Link>
    </div>
  );
}
