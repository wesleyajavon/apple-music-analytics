"use client";

import { type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import {
  SoundprintBrandDivider,
} from "@/lib/components/soundprint-brand-divider";

export function OverviewCanvasFrame({
  eyebrow,
  title,
  description,
  titleId,
  seeMoreHref,
  seeMoreLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  titleId?: string;
  seeMoreHref?: string;
  seeMoreLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full min-w-0" aria-labelledby={titleId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
          <h2 id={titleId} className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {seeMoreHref && seeMoreLabel ? (
          <Link href={seeMoreHref} className={`${DASHBOARD_BTN_GHOST} shrink-0 self-start`}>
            {seeMoreLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function OverviewSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
        <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1`}>{title}</h2>
      </div>
      <p className="max-w-xl text-[13px] leading-6 text-muted">{description}</p>
    </div>
  );
}

/** Quiet pause between sibling overview blocks. */
export function OverviewSectionRule({
  compact = false,
  plain = false,
}: {
  compact?: boolean;
  plain?: boolean;
}) {
  const spacing = compact ? "py-4" : "py-6 sm:py-8";

  if (plain) {
    return (
      <div className={`mx-auto w-full max-w-2xl ${spacing}`} aria-hidden>
        <div className="h-px bg-gradient-to-r from-transparent via-card-border to-transparent" />
      </div>
    );
  }

  return (
    <SoundprintBrandDivider
      logoSize="sm"
      lineStyle="fade"
      maxWidth="narrow"
      className={spacing}
    />
  );
}
