"use client";

import { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SoundprintBrandMark } from "@/lib/components/soundprint-brand-mark";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";

/**
 * Rappel de marque dans la zone principale du dashboard (surtout mobile, où la sidebar est masquée).
 */
export function DashboardToolbarBrand() {
  const searchParams = useSearchParams();
  const t = useTranslations("sidebar");
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const { publicProfileUserId } = usePublicDemo();

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUserId(data.user?.id ?? null);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const href = useMemo(() => {
    const isPublicDemoViewer =
      !authUserId &&
      !!publicProfileUserId &&
      searchParams.get("userId") === publicProfileUserId;
    const target = isPublicDemoViewer ? "/" : mergeDashboardSearchParams("/dashboard", searchParams);
    return target;
  }, [authUserId, publicProfileUserId, searchParams]);

  return (
    <div className="border-b border-card-border/70 bg-surface-glass/80 px-4 py-2.5 backdrop-blur-md lg:hidden">
      <Link
        href={href}
        className="group inline-flex max-w-full items-center rounded-lg outline-none ring-offset-background transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("logo")}
      >
        <SoundprintBrandMark
          size="lg"
          layout="stacked"
          showAiBadgeOnMobile
          tagline={t("tagline")}
        />
      </Link>
    </div>
  );
}
