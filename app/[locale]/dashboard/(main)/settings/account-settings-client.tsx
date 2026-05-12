"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

const SUBNAV_STICKY_TOP =
  "top-[calc(var(--dashboard-filter-height,4.5rem)+0.5rem)]";

function SettingsSwitch({
  id,
  checked,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? "bg-accent-emerald" : "bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`pointer-events-none block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition-transform dark:bg-foreground/95 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-card-border bg-card-surface shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

function IconSliders() {
  return (
    <svg
      className="h-5 w-5 text-accent-violet"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconDataPrivacy() {
  return (
    <svg
      className="h-5 w-5 text-red-600 dark:text-red-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg
      className="h-5 w-5 text-accent-indigo"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21a8 8 0 00-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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
  const [nameInput, setNameInput] = useState("");
  const [initialName, setInitialName] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileKey, setProfileKey] = useState(0);

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
    (async () => {
      setProfileLoadError(null);
      try {
        const res = await fetch("/api/user/me");
        const data = (await res.json().catch(() => ({}))) as {
          user?: { name: string | null; email: string | null } | null;
        };
        if (cancelled) return;
        if (!res.ok) {
          setProfileLoadError(t("profileLoadError"));
          return;
        }
        const n = data.user?.name ?? "";
        setNameInput(n);
        setInitialName(n);
        setAccountEmail(data.user?.email ?? null);
      } catch {
        if (!cancelled) setProfileLoadError(t("profileLoadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, userId]);

  useEffect(() => {
    if (!profileSaved) return;
    const tmt = window.setTimeout(() => setProfileSaved(false), 4000);
    return () => window.clearTimeout(tmt);
  }, [profileSaved]);

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
  }, [t, userId, profileKey]);

  const phraseOk =
    expectedPhrase != null &&
    phraseInput.length > 0 &&
    deletionPhrasesMatch(phraseInput, expectedPhrase);

  const nameDirty =
    initialName !== null && nameInput.trim() !== (initialName ?? "").trim();
  const profileSaveDisabled =
    initialName === null ||
    !nameDirty ||
    !!nameFieldError ||
    profileSaving ||
    !!profileLoadError;

  const saveProfile = useCallback(async () => {
    if (initialName === null) return;
    if (nameInput.trim() === initialName.trim()) return;
    if (nameFieldError) return;
    if (profileSaving) return;
    if (profileLoadError) return;
    setProfileSaveError(null);
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: { name: string | null; email: string | null };
        error?: string;
      };
      if (!res.ok) {
        setProfileSaveError(data.error ?? t("profileSaveError"));
        return;
      }
      const n = data.user?.name ?? "";
      setNameInput(n);
      setInitialName(n);
      if (data.user?.email !== undefined) setAccountEmail(data.user.email);
      setProfileSaved(true);
      setProfileKey((k) => k + 1);
    } catch {
      setProfileSaveError(t("profileSaveError"));
    } finally {
      setProfileSaving(false);
    }
  }, [initialName, nameFieldError, nameInput, profileLoadError, profileSaving, t]);

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
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-3">
          <div className="h-3 w-24 animate-pulse rounded-md bg-border" />
          <div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-border" />
          <div className="h-4 w-full max-w-lg animate-pulse rounded-md bg-border/80" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-24 animate-pulse rounded-full bg-border/90" />
          <div className="h-9 w-28 animate-pulse rounded-full bg-border/90" />
          <div className="h-9 w-32 animate-pulse rounded-full bg-border/90" />
        </div>
        <div className="h-44 animate-pulse rounded-2xl bg-border/75" />
        <div className="h-40 animate-pulse rounded-2xl bg-border/70" />
        <div className="h-72 animate-pulse rounded-2xl bg-border/60" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-card-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {t("pageEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
        </header>
        <SectionCard className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">{t("signedOutTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("signedOutHint")}
          </p>
          <div className="mt-6">
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("signInCta")}
            </Link>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="relative mb-6 border-b border-card-border pb-8 sm:mb-8">
        <div
          className="pointer-events-none absolute -left-4 top-0 h-24 w-40 rounded-full bg-brand-gradient-soft opacity-70 blur-2xl sm:-left-6"
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t("pageEyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          {t("subtitle")}
        </p>
      </header>

      <nav
        className={`-mx-1 mb-8 flex flex-wrap items-center gap-2 border-b border-transparent sm:sticky ${SUBNAV_STICKY_TOP} z-20 bg-surface-dashboard/90 pb-3 backdrop-blur-sm dark:bg-surface-dashboard/95`}
        aria-label={t("navOnThisPage")}
      >
        <a
          href="#settings-profile"
          className="inline-flex min-h-9 items-center rounded-full border border-card-border bg-card-surface px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("sectionProfile")}
        </a>
        <a
          href="#settings-preferences"
          className="inline-flex min-h-9 items-center rounded-full border border-card-border bg-card-surface px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("sectionPreferences")}
        </a>
        <a
          href="#settings-data-privacy"
          className="inline-flex min-h-9 items-center rounded-full border border-card-border bg-card-surface px-4 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("sectionDataPrivacy")}
        </a>
      </nav>

      <div className="space-y-10">
        <section
          id="settings-profile"
          className="scroll-mt-28"
          aria-labelledby="settings-profile-heading"
        >
          <div className="mb-4">
            <h2
              id="settings-profile-heading"
              className="flex items-center gap-2.5 text-lg font-semibold text-foreground"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-indigo/10 dark:bg-accent-indigo/20">
                <IconUser />
              </span>
              {t("sectionProfile")}
            </h2>
            <p className="mt-1.5 text-sm text-muted">{t("sectionProfileLead")}</p>
          </div>

          <SectionCard>
            {profileLoadError ? (
              <p className="p-5 text-sm font-medium text-red-700 dark:text-red-300 sm:p-6" role="alert">
                {profileLoadError}
              </p>
            ) : (
              <form
                className="space-y-5 p-5 sm:p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveProfile();
                }}
                noValidate
              >
                <div>
                  <label htmlFor="settings-display-name" className="text-sm font-medium text-foreground">
                    {t("profileNameLabel")}
                  </label>
                  <input
                    id="settings-display-name"
                    type="text"
                    name="displayName"
                    autoComplete="name"
                    maxLength={200}
                    value={nameInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNameInput(v);
                      setProfileSaved(false);
                      setProfileSaveError(null);
                      if (v.length > 200) setNameFieldError(t("profileNameTooLong"));
                      else setNameFieldError(null);
                    }}
                    aria-invalid={!!nameFieldError}
                    aria-describedby={nameFieldError ? "settings-name-error" : undefined}
                    className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 dark:border-border dark:bg-surface-raised"
                  />
                  {nameFieldError ? (
                    <p id="settings-name-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                      {nameFieldError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">{t("profileEmailLabel")}</p>
                  <p className="mt-2 rounded-xl border border-dashed border-border bg-background/60 px-3 py-2.5 text-sm text-muted dark:bg-background/30">
                    {accountEmail ?? "—"}
                  </p>
                  <p className="mt-1.5 text-xs text-muted">{t("profileEmailHint")}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-6 text-sm">
                    {profileSaved ? (
                      <span className="font-medium text-accent-emerald" role="status">
                        {t("profileSaved")}
                      </span>
                    ) : null}
                    {profileSaveError ? (
                      <span className="font-medium text-red-600 dark:text-red-400" role="alert">
                        {profileSaveError}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={profileSaveDisabled}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
                  >
                    {profileSaving ? t("savingProfile") : t("saveProfile")}
                  </button>
                </div>
              </form>
            )}
          </SectionCard>
        </section>

        <section
          id="settings-preferences"
          className="scroll-mt-28"
          aria-labelledby="settings-preferences-heading"
        >
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="settings-preferences-heading"
                className="flex items-center gap-2.5 text-lg font-semibold text-foreground"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-violet/10 dark:bg-accent-violet/20">
                  <IconSliders />
                </span>
                {t("sectionPreferences")}
              </h2>
              <p className="mt-1.5 text-sm text-muted">{t("sectionPreferencesLead")}</p>
            </div>
          </div>

          <SectionCard>
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{t("genreBannerTitle")}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {t("genreBannerDescription")}
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-card-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="text-sm font-medium text-foreground">{t("genreBannerHideLabel")}</p>
                <div className="flex shrink-0 justify-end sm:justify-start">
                  <SettingsSwitch
                    aria-label={t("switchHideGenreAria")}
                    checked={hideGenreBanner}
                    onChange={(next) => {
                      if (next) setGenreBackfillBannerOptOut(true);
                      else clearGenreBackfillBannerBlockingPrefs();
                      setHideGenreBanner(next);
                    }}
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </section>

        <section
          id="settings-data-privacy"
          className="scroll-mt-28"
          aria-labelledby="settings-data-heading"
        >
          <div className="mb-4">
            <h2
              id="settings-data-heading"
              className="flex items-center gap-2.5 text-lg font-semibold text-foreground"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 dark:bg-red-500/15">
                <IconDataPrivacy />
              </span>
              {t("sectionDataPrivacy")}
            </h2>
            <p className="mt-1.5 text-sm text-muted">{t("sectionDataPrivacyLead")}</p>
          </div>

          <SectionCard className="mb-8 border border-card-border shadow-card">
            <div className="space-y-3 p-5 sm:p-6">
              <h3 className="text-base font-semibold text-foreground">{t("importExportsTitle")}</h3>
              <p className="text-sm leading-relaxed text-muted">{t("importExportsBody")}</p>
              <Link
                href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-card-border bg-card-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("importExportsCta")}
              </Link>
            </div>
          </SectionCard>

          <div className="overflow-hidden rounded-2xl border border-red-200/80 bg-gradient-to-b from-red-50/90 to-red-50/40 shadow-card dark:border-red-900/50 dark:from-red-950/30 dark:to-red-950/10">
            <div className="border-b border-red-200/60 p-4 sm:p-6 dark:border-red-900/40">
              <h3
                className="text-base font-semibold text-red-950 dark:text-red-200"
                id="danger-heading"
              >
                {t("dangerTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-red-900/90 dark:text-red-200/90">
                {t("dangerBody")}
              </p>
              <ul className="mt-4 space-y-2 rounded-xl border border-red-200/50 bg-white/60 p-3 text-sm text-red-900/90 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200/90">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>
                    •
                  </span>
                  <span>{t("dangerBulletListens")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>
                    •
                  </span>
                  <span>{t("dangerBulletReplay")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>
                    •
                  </span>
                  <span>{t("dangerBulletOnboarding")}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              {phraseLoadError ? (
                <p className="text-sm font-medium text-red-800 dark:text-red-300" role="alert">
                  {phraseLoadError}
                </p>
              ) : expectedPhrase ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/90 dark:text-foreground/95">
                    {t("phraseInstruction")}
                  </p>
                  <div className="rounded-xl border border-border bg-background/80 px-4 py-3 font-mono text-base font-semibold tracking-wide text-foreground dark:bg-background/50">
                    {expectedPhrase}
                  </div>
                  <div>
                    <label
                      className="text-sm font-medium text-foreground"
                      htmlFor="deletion-confirmation-phrase"
                    >
                      {t("phraseLabel")}
                    </label>
                    <input
                      id="deletion-confirmation-phrase"
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
                      className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-mono text-sm text-foreground shadow-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 dark:border-border dark:bg-surface-raised"
                    />
                    <p className="mt-2 text-xs text-muted">{t("phraseHint")}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">{tCommon("pleaseWait")}</p>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  understood
                    ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                    : "border-border bg-background/50 dark:bg-surface-raised/40"
                } ${!expectedPhrase || !!phraseLoadError ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-ring/40"
                  checked={understood}
                  onChange={(e) => {
                    setUnderstood(e.target.checked);
                    setError(null);
                  }}
                  disabled={!expectedPhrase || !!phraseLoadError}
                  aria-label={t("switchUnderstandAria")}
                />
                <span className="text-sm text-foreground">{t("confirmCheckbox")}</span>
              </label>

              {error ? (
                <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => void runClear()}
                  disabled={
                    !understood || !phraseOk || clearing || !!phraseLoadError || !expectedPhrase
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80 sm:w-auto"
                >
                  {clearing ? t("clearing") : t("clearDataButton")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
