"use client";

import { useTranslations } from "next-intl";
import { OverviewSectionHeader } from "@/lib/components/overview-section";
import { OverviewFeaturePromos } from "@/lib/components/overview-feature-promos";
import { DASHBOARD_SECTION_EYEBROW, DASHBOARD_SECTION_TITLE } from "@/lib/components/dashboard-ui";

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
          <p className={DASHBOARD_SECTION_EYEBROW}>{t("eyebrow")}</p>
          <h2 className={`${DASHBOARD_SECTION_TITLE} mt-1 text-lg`}>{t("title")}</h2>
        </div>
      ) : (
        <OverviewSectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
      )}
      <OverviewFeaturePromos
        soundprintChatHref={soundprintChatHref}
        duetHref={duetHref}
        variant={compact ? "stack" : "grid"}
      />
    </section>
  );
}
