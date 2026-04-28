"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { Footer } from "@/lib/components/footer";
import { SoundprintLogo } from "@/lib/components/soundprint-logo";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Home() {
  const t = useTranslations("home");
  const tAuth = useTranslations("auth");
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    function extractFirstName(rawName?: string | null) {
      if (!rawName) return null;
      const cleaned = rawName.trim();
      if (!cleaned) return null;
      return cleaned.split(/\s+/)[0] ?? null;
    }

    function resolveFirstName(user: { user_metadata?: Record<string, unknown> } | null) {
      if (!user?.user_metadata) return null;
      const metadata = user.user_metadata;
      const candidate =
        (metadata.full_name as string | undefined) ??
        (metadata.name as string | undefined) ??
        (metadata.given_name as string | undefined) ??
        (metadata.preferred_username as string | undefined) ??
        null;
      return extractFirstName(candidate);
    }

    async function hydrateUserName() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsAuthenticated(!!data.user);
      setFirstName(resolveFirstName(data.user));
    }

    hydrateUserName();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsAuthenticated(!!session?.user);
      setFirstName(resolveFirstName(session?.user ?? null));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const welcomeMessage = useMemo(() => {
    if (!firstName) return t("welcome");
    return t("welcomePersonal", { name: firstName });
  }, [firstName, t]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-app-shell" aria-hidden />
        <div
          className="absolute top-1/4 -left-32 -z-10 h-64 w-64 rounded-full bg-accent-rose/20 blur-3xl dark:bg-accent-rose/20"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 -right-32 -z-10 h-80 w-80 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/15"
          aria-hidden
        />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="rounded-xl bg-surface-glass px-3 py-2 shadow-card ring-1 ring-card-border backdrop-blur">
            <SoundprintLogo />
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher placement="bottom" />
            <Suspense
              fallback={<div className="h-10 w-32 animate-pulse rounded-xl bg-card-surface" />}
            >
              <LanguageSwitcher placement="bottom" />
            </Suspense>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-14 pt-6 text-center">
          <SoundprintLogo
            className="mb-6 flex-col gap-3"
            imageClassName="h-36 w-36 rounded-3xl shadow-brand-glow ring-1 ring-white/10 sm:h-44 sm:w-44"
            showText={false}
            priority
          />
          <h1 className="mb-4 max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {welcomeMessage}
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-muted">
            {t("subtitle")}
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:scale-[1.01] hover:opacity-95"
              >
                {t("goToDashboard")}
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:scale-[1.01] hover:opacity-95"
                >
                  {tAuth("signUp")}
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-xl border border-card-border bg-surface-glass px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:bg-card-surface"
                >
                  {tAuth("signIn")}
                </Link>
              </>
            )}
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              {t("accessDashboard")}
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>

          <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-card-border bg-card-surface p-4 text-left shadow-card backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("features.timeline.title")}
              </p>
              <p className="mt-2 text-sm text-foreground/80">
                {t("features.timeline.description")}
              </p>
            </div>
            <div className="rounded-2xl border border-card-border bg-card-surface p-4 text-left shadow-card backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("features.genresArtists.title")}
              </p>
              <p className="mt-2 text-sm text-foreground/80">
                {t("features.genresArtists.description")}
              </p>
            </div>
            <div className="rounded-2xl border border-card-border bg-card-surface p-4 text-left shadow-card backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t("features.aiInsights.title")}
              </p>
              <p className="mt-2 text-sm text-foreground/80">
                {t("features.aiInsights.description")}
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="home" />
    </div>
  );
}
