"use client";

import React from "react";
import { Link } from "@/i18n/navigation";
import { GenreAccuracyChooser } from "@/lib/components/palette/genre-accuracy-chooser";

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
  className = "relative max-w-3xl overflow-hidden rounded-[1.25rem] border border-slate-200/85 bg-gradient-to-br from-white via-slate-50/95 to-white px-4 py-3.5 text-sm text-slate-800 shadow-lg shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.04] dark:border-white/10 dark:from-slate-950/50 dark:via-slate-950/35 dark:to-slate-950/25 dark:text-slate-100",
  linkClassName = "font-semibold text-violet-600 underline decoration-violet-300/55 underline-offset-2 hover:text-violet-800 dark:text-violet-300 dark:decoration-violet-400/45 dark:hover:text-white",
  showGroqCta = false,
  viewerUserId,
}: PaletteMappingNoticeProps) {
  if (isPublicDemoViewer) {
    return null;
  }

  if (showGroqCta) {
    return <GenreAccuracyChooser viewerUserId={viewerUserId} className="max-w-3xl" />;
  }

  return (
    <div className={className}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.06),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.05),transparent_38%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent dark:via-violet-400/25" aria-hidden />
      <div className="relative">
        <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 text-slate-700 dark:text-slate-200">
          {body}
          {" "}
          <Link href="/dashboard/genres/palette" className={linkClassName}>
            {linkLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
