"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

type OverviewTasteTeaserProps = {
  href: string;
};

export function OverviewTasteTeaser({ href }: OverviewTasteTeaserProps) {
  const t = useTranslations("overview.tasteTeaser");

  return (
    <Link
      href={href}
      aria-label={t("aria")}
      className="group flex items-start justify-between gap-4 rounded-[1.75rem] border border-card-border bg-surface-glass/80 p-5 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:border-accent-violet/25 hover:shadow-card-hover sm:p-6"
    >
      <div className="min-w-0">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {t("eyebrow")}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">
          {t("title")}
        </h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{t("description")}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary transition group-hover:gap-2">
          {t("cta")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
