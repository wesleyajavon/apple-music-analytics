"use client";

import { useMemo, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { useMobileSidebar } from "@/lib/components/sidebar";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";

/**
 * Rappel de marque dans la zone principale du dashboard (surtout mobile, où la sidebar est repliée).
 */
export function DashboardToolbarBrand() {
  const searchParams = useSearchParams();
  const t = useTranslations("sidebar");
  const { toggle: toggleMobileSidebar } = useMobileSidebar();
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const publicProfileUserId = useMemo(() => getPublicProfileUserId(), []);

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
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-card-border bg-card-surface text-muted shadow-card transition-all hover:text-primary hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={t("openMenu")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="inline-flex max-w-full items-center rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("logo")}
          >
            <SoundprintLogo
              showText
              imageClassName="h-9 w-9 shrink-0 rounded-xl shadow-brand-glow ring-1 ring-card-border/50"
              textClassName="truncate text-base font-bold tracking-tight text-foreground"
            />
          </Link>
          <p className="mt-1.5 hidden text-[11px] leading-snug text-muted sm:block">
            {t("tagline")}
          </p>
        </div>
      </div>
    </div>
  );
}
