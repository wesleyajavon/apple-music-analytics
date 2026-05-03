"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { GroqGenreBackfillCta } from "@/lib/components/palette/groq-genre-backfill-cta";

type PaletteMappingNoticeProps = {
  title: string;
  body: string;
  linkLabel: string;
  isPublicDemoViewer: boolean;
  className?: string;
  linkClassName?: string;
  showGroqCta?: boolean;
  viewerUserId?: string | null;
};

export function PaletteMappingNotice({
  title,
  body,
  linkLabel,
  isPublicDemoViewer,
  className = "max-w-3xl rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm shadow-amber-950/5 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100",
  linkClassName = "font-semibold underline decoration-amber-500/60 underline-offset-2 hover:decoration-amber-600 dark:decoration-amber-300/70",
  showGroqCta = false,
  viewerUserId,
}: PaletteMappingNoticeProps) {
  if (isPublicDemoViewer) {
    return null;
  }

  return (
    <div className={className}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1">
        {body}
        {" "}
        <Link href="/dashboard/genres/palette" className={linkClassName}>
          {linkLabel}
        </Link>
      </p>
      {showGroqCta ? (
        <GroqGenreBackfillCta
          viewerUserId={viewerUserId}
          className="mt-3 space-y-2 border-t border-amber-200/70 pt-2.5 dark:border-amber-800/50"
        />
      ) : null}
    </div>
  );
}
