"use client";

import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { Footer } from "@/lib/components/footer";
import { ThemeSwitcher } from "@/lib/components/theme-switcher";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";

export default function Home() {
  const t = useTranslations("home");
  const tAuth = useTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20"
          aria-hidden
        />
        <div
          className="absolute top-1/4 -left-32 -z-10 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl dark:bg-blue-900/20"
          aria-hidden
        />
        <div
          className="absolute bottom-1/4 -right-32 -z-10 h-80 w-80 rounded-full bg-indigo-100/30 blur-3xl dark:bg-indigo-900/15"
          aria-hidden
        />

        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold tracking-wide text-gray-900 shadow-sm ring-1 ring-gray-200 backdrop-blur dark:bg-gray-900/70 dark:text-gray-100 dark:ring-gray-700">
            Apple Music Analytics
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher placement="bottom" />
            <Suspense
              fallback={<div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />}
            >
              <LanguageSwitcher placement="bottom" />
            </Suspense>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-14 pt-6 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-600 dark:text-blue-400">
            {t("title")}
          </p>
          <h1 className="mb-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            {t("welcome")}
          </h1>
          <p className="mb-10 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t("subtitle")}
          </p>

          <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-xl bg-accent-violet px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-violet/20 transition-all hover:opacity-90"
            >
              {tAuth("signUp")}
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {tAuth("signIn")}
            </Link>
            <Link
              href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
              className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-accent-violet transition-colors hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20"
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
            <div className="rounded-2xl border border-gray-200/80 bg-white/85 p-4 text-left shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Timeline
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Visualise tes habitudes d’ecoute au fil du temps.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white/85 p-4 text-left shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Genres & Artists
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Explore tes tops, tendances et evolutions musicales.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/80 bg-white/85 p-4 text-left shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                AI Insights
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Obtiens des analyses rapides basees sur tes statistiques.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="home" />
    </div>
  );
}
