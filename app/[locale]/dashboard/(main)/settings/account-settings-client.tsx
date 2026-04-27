"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deletionPhrasesMatch } from "@/lib/user/deletion-confirmation-phrase";
import {
  clearGenreBackfillBannerBlockingPrefs,
  getGenreBackfillBannerOptOut,
  setGenreBackfillBannerOptOut,
} from "@/lib/utils/genre-backfill-banner-prefs";

export function AccountSettingsClient() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [expectedPhrase, setExpectedPhrase] = useState<string | null>(null);
  const [phraseLoadError, setPhraseLoadError] = useState<string | null>(null);
  const [phraseInput, setPhraseInput] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideGenreBanner, setHideGenreBanner] = useState(false);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function sync() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(data.user?.id ?? null);
      setAuthReady(true);
    }

    sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setHideGenreBanner(getGenreBackfillBannerOptOut());
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function loadPhrase() {
      setPhraseLoadError(null);
      setExpectedPhrase(null);
      try {
        const res = await fetch("/api/user/clear-analytics");
        const data = (await res.json().catch(() => ({}))) as {
          phrase?: string;
          code?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          if (isRecentAuthRequiredError(data)) {
            setPhraseLoadError(t("recentAuthRequired"));
            redirectToRecentSignIn(window.location.pathname + window.location.search);
            return;
          }
          if (data.code === "NO_CONFIRMATION_PHRASE") {
            setPhraseLoadError(t("noPhraseError"));
          } else {
            setPhraseLoadError(data.error ?? t("phraseLoadError"));
          }
          return;
        }
        if (data.phrase) setExpectedPhrase(data.phrase);
      } catch {
        if (!cancelled) setPhraseLoadError(t("phraseLoadError"));
      }
    }

    void loadPhrase();
    return () => {
      cancelled = true;
    };
  }, [t, userId]);

  const phraseOk =
    expectedPhrase != null &&
    phraseInput.length > 0 &&
    deletionPhrasesMatch(phraseInput, expectedPhrase);

  const runClear = useCallback(async () => {
    if (!expectedPhrase || !phraseOk) return;
    setError(null);
    setClearing(true);
    try {
      const res = await fetch("/api/user/clear-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, phrase: phraseInput }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (isRecentAuthRequiredError(data)) {
          setError(t("recentAuthRequired"));
          redirectToRecentSignIn(window.location.pathname + window.location.search);
          return;
        }
        if (data.code === "PHRASE_MISMATCH") {
          setError(t("phraseMismatch"));
        } else if (data.code === "NO_CONFIRMATION_PHRASE") {
          setError(t("noPhraseError"));
        } else {
          setError(data.error ?? t("clearError"));
        }
        return;
      }
      router.push("/dashboard/onboarding");
    } catch {
      setError(t("clearError"));
    } finally {
      setClearing(false);
      setUnderstood(false);
      setPhraseInput("");
    }
  }, [expectedPhrase, phraseInput, phraseOk, router, t]);

  if (!authReady) {
    return (
      <div className="max-w-2xl">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{t("signedOutHint")}</p>
        <Link
          href="/sign-in"
          className="inline-flex rounded-xl bg-accent-violet px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("signInCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("subtitle")}</p>
      </div>

      <section
        className="rounded-2xl border border-gray-200/90 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-900/40"
        aria-labelledby="genre-banner-prefs-heading"
      >
        <h2
          id="genre-banner-prefs-heading"
          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        >
          {t("genreBannerTitle")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t("genreBannerDescription")}</p>
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-accent-violet focus:ring-accent-violet/30 dark:border-gray-600 dark:bg-gray-900"
            checked={hideGenreBanner}
            onChange={(e) => {
              const next = e.target.checked;
              if (next) setGenreBackfillBannerOptOut(true);
              else clearGenreBackfillBannerBlockingPrefs();
              setHideGenreBanner(next);
            }}
          />
          <span>{t("genreBannerHideLabel")}</span>
        </label>
      </section>

      <section
        className="rounded-2xl border border-red-200/80 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20"
        aria-labelledby="danger-heading"
      >
        <h2
          id="danger-heading"
          className="text-lg font-semibold text-red-900 dark:text-red-200"
        >
          {t("dangerTitle")}
        </h2>
        <p className="mt-2 text-sm text-red-900/90 dark:text-red-200/90">
          {t("dangerBody")}
        </p>
        <ul className="mt-3 list-inside list-disc text-sm text-red-900/85 dark:text-red-200/85">
          <li>{t("dangerBulletListens")}</li>
          <li>{t("dangerBulletReplay")}</li>
          <li>{t("dangerBulletOnboarding")}</li>
        </ul>

        {phraseLoadError ? (
          <p className="mt-5 text-sm font-medium text-red-800 dark:text-red-300" role="alert">
            {phraseLoadError}
          </p>
        ) : expectedPhrase ? (
          <>
            <p className="mt-5 text-sm text-gray-800 dark:text-gray-200">{t("phraseInstruction")}</p>
            <p className="mt-2 font-mono text-base font-semibold tracking-wide text-red-900 dark:text-red-200">
              {expectedPhrase}
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-800 dark:text-gray-200">
              {t("phraseLabel")}
              <input
                type="text"
                name="deletion-confirmation-phrase"
                autoComplete="off"
                spellCheck={false}
                value={phraseInput}
                onChange={(e) => {
                  setPhraseInput(e.target.value);
                  setError(null);
                }}
                placeholder={t("phrasePlaceholder")}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-accent-violet focus:outline-none focus:ring-2 focus:ring-accent-violet/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
            </label>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{t("phraseHint")}</p>
          </>
        ) : (
          <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">{tCommon("pleaseWait")}</p>
        )}

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-accent-violet focus:ring-accent-violet/30 dark:border-gray-600 dark:bg-gray-900"
            checked={understood}
            onChange={(e) => {
              setUnderstood(e.target.checked);
              setError(null);
            }}
            disabled={!expectedPhrase || !!phraseLoadError}
          />
          <span>{t("confirmCheckbox")}</span>
        </label>

        {error ? (
          <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void runClear()}
          disabled={
            !understood || !phraseOk || clearing || !!phraseLoadError || !expectedPhrase
          }
          className="mt-5 w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60 sm:w-auto"
        >
          {clearing ? t("clearing") : t("clearDataButton")}
        </button>
      </section>
    </div>
  );
}
