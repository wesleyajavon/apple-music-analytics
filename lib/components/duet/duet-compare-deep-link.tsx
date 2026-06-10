"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Swords } from "lucide-react";
import type { DuetArenaMode } from "@/lib/components/duet/duet-battle-arena-ui";

type DuetCompareDeepLinkProps = {
  entityType: DuetArenaMode | "genre";
  entityId: string;
  className?: string;
};

const DATE_FILTER_KEYS = ["startDate", "endDate", "period", "range"] as const;

export function DuetCompareDeepLink({
  entityType,
  entityId,
  className,
}: DuetCompareDeepLinkProps) {
  const t = useTranslations("duet.compare");
  const searchParams = useSearchParams();

  const href = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of DATE_FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    params.set("arenaMode", entityType);
    params.set("entityType", entityType);
    params.set("entityId", entityId);
    return `/dashboard/duet/compare?${params.toString()}`;
  }, [searchParams, entityType, entityId]);

  return (
    <Link
      href={href}
      className={
        className ??
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-violet-200/90 bg-violet-50/90 px-3 py-1.5 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"
      }
    >
      <Swords className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {t("deepLinkCompare")}
    </Link>
  );
}
