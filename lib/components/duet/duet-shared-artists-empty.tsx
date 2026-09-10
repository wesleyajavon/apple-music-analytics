"use client";

import { DASHBOARD_SECTION_EYEBROW, DASHBOARD_SECTION_TITLE } from "@/lib/components/dashboard-ui";

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
      <div className="flex flex-col items-start text-left sm:items-center sm:text-center">
        <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
        <h3 className={`mt-2 ${DASHBOARD_SECTION_TITLE} text-xl sm:text-2xl`}>{title}</h3>
        <p className="mt-2 max-w-md text-[13px] leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}
