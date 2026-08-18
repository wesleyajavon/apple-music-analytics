"use client";

import { useTranslations } from "next-intl";
import { OverviewSectionHeader } from "@/lib/components/overview-section";
import { OverviewFeaturePromos } from "@/lib/components/overview-feature-promos";

type OverviewGoFurtherSectionProps = {
  soundprintChatHref: string;
  duetHref: string;
  compact?: boolean;
};

export function OverviewGoFurtherSection({
  soundprintChatHref,
  duetHref,
  compact = false,
}: OverviewGoFurtherSectionProps) {
  const t = useTranslations("overview.sections.goFurther");

  return (
    <section className="relative">
      {compact ? (
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-foreground dark:text-white">
            {t("title")}
          </h2>
        </div>
      ) : (
        <OverviewSectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
      )}
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-3 text-white shadow-2xl shadow-black/25 sm:p-4">
        <OverviewFeaturePromos
          soundprintChatHref={soundprintChatHref}
          duetHref={duetHref}
          variant={compact ? "stack" : "grid"}
        />
      </div>
    </section>
  );
}
