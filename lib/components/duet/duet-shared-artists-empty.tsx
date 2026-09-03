"use client";

import { DASHBOARD_SPOTLIGHT_MUTED } from "@/lib/constants/dashboard-spotlight";

type DuetSharedArtistsEmptyProps = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

export function DuetSharedArtistsEmpty({
  eyebrow,
  title,
  description,
  className = "",
}: DuetSharedArtistsEmptyProps) {
  return (
    <div className={className} role="status" aria-label={title}>
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-10 w-10 rounded-full border-2 border-violet-400/70 bg-violet-400/15 dark:border-violet-300/45 dark:bg-violet-400/10" />
          <span className="h-10 w-10 rounded-full border-2 border-cyan-400/70 bg-cyan-400/15 dark:border-cyan-300/45 dark:bg-cyan-400/10" />
        </div>
        <p className="mt-5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-xl">
          {title}
        </h3>
        <p className={`mt-2 max-w-md text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{description}</p>
      </div>
    </div>
  );
}
