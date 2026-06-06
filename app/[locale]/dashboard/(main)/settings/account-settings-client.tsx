"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Settings2, Upload } from "lucide-react";
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
import { UserAvatar } from "@/lib/components/user-avatar";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_TABLE,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_PILL_MUTED,
} from "@/lib/constants/dashboard-spotlight";
import {
  SettingsMobileExperience,
  SettingsMobileSignedOut,
  SettingsMobileSkeleton,
} from "./settings-mobile";
import { SettingsSwitch } from "./settings-shared";

const SUBNAV_STICKY_TOP =
  "top-[calc(var(--dashboard-filter-height,4.5rem)+0.5rem)]";

const SETTINGS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/15 sm:text-sm dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function SettingsHeroTrustPanel() {
  const t = useTranslations("settings");
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust1")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust2")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust3")}</span>
      </li>
    </ul>
  );
}

function SettingsHeroSignedOutTrustPanel() {
  const t = useTranslations("settings");
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]" aria-hidden />
        <span>{t("signedOutTrust1")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]" aria-hidden />
        <span>{t("signedOutTrust2")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.45)]" aria-hidden />
        <span>{t("signedOutTrust3")}</span>
      </li>
    </ul>
  );
}

function SettingsHeroConnected() {
  const t = useTranslations("settings");
  return (
    <div className={SETTINGS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Settings2 className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/overview"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {t("ctaOverview")}
            </Link>
            <Link
              href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15 sm:w-auto"
            >
              {t("importExportsCta")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              <SettingsHeroTrustPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsHeroSignedOut() {
  const t = useTranslations("settings");
  return (
    <div className={SETTINGS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]" />
            {t("signedOutHeroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Settings2 className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("signedOutHint")}</p>
          <div className="mt-7">
            <Link
              href="/sign-in"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              {t("signInCta")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("signedOutStatBadge")}</p>
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-amber-100">{t("signedOutStatTag")}</span>
              </div>
              <SettingsHeroSignedOutTrustPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSpotlightSection({
  gradientClass,
  hairlineClass,
  iconBgClass,
  icon,
  titleId,
  heading,
  lead,
  children,
}: {
  gradientClass: string;
  hairlineClass: string;
  iconBgClass: string;
  icon: ReactNode;
  titleId: string;
  heading: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/35`}>
      <div className={gradientClass} aria-hidden />
      <div className={hairlineClass} aria-hidden />
      <div className="relative">
        <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-5 py-4 sm:px-6 sm:py-5`}>
          <div className="flex gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBgClass}`}>{icon}</span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
                {heading}
              </h2>
              <p className={`mt-1 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{lead}</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}

function IconSliders() {
  return (
    <svg className="h-5 w-5 text-violet-600 dark:text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
    <svg className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21a8 8 0 00-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function AccountSettingsClient() {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [expectedPhrase, setExpectedPhrase] = useState<string | null>(null);
  const [phraseLoadError, setPhraseLoadError] = useState<string | null>(null);
  const [phraseInput, setPhraseInput] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteAccountUnderstood, setDeleteAccountUnderstood] = useState(false);
  const [deleteAccountPhraseInput, setDeleteAccountPhraseInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideGenreBanner, setHideGenreBanner] = useState(false);
  const [groqConsentGranted, setGroqConsentGranted] = useState(false);
  const [publicProfileEligible, setPublicProfileEligible] = useState(false);
  const [publicProfileGranted, setPublicProfileGranted] = useState(false);
  const [privacyPrefsLoaded, setPrivacyPrefsLoaded] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [initialName, setInitialName] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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

    void sync();

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
    if (!userId) {
      setPrivacyPrefsLoaded(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setPrivacyError(null);
      try {
        const res = await fetch("/api/user/privacy-preferences");
        const data = (await res.json().catch(() => ({}))) as {
          groqGenreConsent?: { granted?: boolean };
          publicProfile?: { eligible?: boolean; granted?: boolean };
        };
        if (cancelled) return;
        if (!res.ok) {
          setPrivacyError(t("groqConsentError"));
          setPrivacyPrefsLoaded(true);
          return;
        }
        setGroqConsentGranted(data.groqGenreConsent?.granted ?? false);
        setPublicProfileEligible(data.publicProfile?.eligible ?? false);
        setPublicProfileGranted(data.publicProfile?.granted ?? false);
        setPrivacyPrefsLoaded(true);
      } catch {
        if (!cancelled) {
          setPrivacyError(t("groqConsentError"));
          setPrivacyPrefsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, userId]);

  const patchPrivacyPreference = useCallback(
    async (payload: { groqGenreConsent?: boolean; publicProfile?: boolean }) => {
      setPrivacySaving(true);
      setPrivacyError(null);
      try {
        const res = await fetch("/api/user/privacy-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as {
          groqGenreConsent?: { granted?: boolean };
          publicProfile?: { eligible?: boolean; granted?: boolean };
          error?: string;
          code?: string;
        };
        if (!res.ok) {
          setPrivacyError(
            typeof data.error === "string" && data.error.length > 0
              ? data.error
              : payload.publicProfile !== undefined
                ? t("publicProfileError")
                : t("groqConsentError")
          );
          return false;
        }
        setGroqConsentGranted(data.groqGenreConsent?.granted ?? false);
        setPublicProfileEligible(data.publicProfile?.eligible ?? false);
        setPublicProfileGranted(data.publicProfile?.granted ?? false);
        return true;
      } catch {
        if (payload.publicProfile !== undefined) {
          setPrivacyError(t("publicProfileError"));
        } else {
          setPrivacyError(t("groqConsentError"));
        }
        return false;
      } finally {
        setPrivacySaving(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      setProfileLoadError(null);
      try {
        const res = await fetch("/api/user/me");
        const data = (await res.json().catch(() => ({}))) as {
          user?: {
            name: string | null;
            email: string | null;
            avatarUrl: string | null;
          } | null;
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
        setAvatarUrl(data.user?.avatarUrl ?? null);
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

  const deleteAccountPhraseOk =
    expectedPhrase != null &&
    deleteAccountPhraseInput.length > 0 &&
    deletionPhrasesMatch(deleteAccountPhraseInput, expectedPhrase);

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
        user?: { name: string | null; email: string | null; avatarUrl: string | null };
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
      if (data.user?.avatarUrl !== undefined) setAvatarUrl(data.user.avatarUrl);
      setProfileSaved(true);
      setProfileKey((k) => k + 1);
    } catch {
      setProfileSaveError(t("profileSaveError"));
    } finally {
      setProfileSaving(false);
    }
  }, [initialName, nameFieldError, nameInput, profileLoadError, profileSaving, t]);

  const uploadAvatar = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setAvatarError(null);
      setProfileSaved(false);

      if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
        setAvatarError(t("profileImageUnsupported"));
        return;
      }
      if (file.size > MAX_AVATAR_BYTES) {
        setAvatarError(t("profileImageTooLarge"));
        return;
      }

      const formData = new FormData();
      formData.set("avatar", file);
      setAvatarUploading(true);
      try {
        const res = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          user?: { name: string | null; email: string | null; avatarUrl: string | null };
          error?: string;
        };
        if (!res.ok) {
          setAvatarError(data.error ?? t("profileImageError"));
          return;
        }
        if (data.user?.avatarUrl !== undefined) setAvatarUrl(data.user.avatarUrl);
        if (data.user?.email !== undefined) setAccountEmail(data.user.email);
        if (data.user?.name !== undefined) {
          const n = data.user.name ?? "";
          setNameInput(n);
          setInitialName(n);
        }
        setProfileSaved(true);
        setProfileKey((k) => k + 1);
      } catch {
        setAvatarError(t("profileImageError"));
      } finally {
        setAvatarUploading(false);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    },
    [t]
  );

  const deleteAvatar = useCallback(async () => {
    if (!avatarUrl || avatarDeleting || avatarUploading) return;
    setAvatarError(null);
    setProfileSaved(false);
    setAvatarDeleting(true);
    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: { name: string | null; email: string | null; avatarUrl: string | null };
        error?: string;
      };
      if (!res.ok) {
        setAvatarError(data.error ?? t("profileImageError"));
        return;
      }
      setAvatarUrl(data.user?.avatarUrl ?? null);
      if (data.user?.email !== undefined) setAccountEmail(data.user.email);
      if (data.user?.name !== undefined) {
        const n = data.user.name ?? "";
        setNameInput(n);
        setInitialName(n);
      }
      setProfileSaved(true);
      setProfileKey((k) => k + 1);
    } catch {
      setAvatarError(t("profileImageError"));
    } finally {
      setAvatarDeleting(false);
    }
  }, [avatarDeleting, avatarUploading, avatarUrl, t]);

  const runExport = useCallback(async () => {
    setExportError(null);
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (isRecentAuthRequiredError(data)) {
          setExportError(t("recentAuthRequired"));
          redirectToRecentSignIn(window.location.pathname + window.location.search);
          return;
        }
        setExportError(data.error ?? t("exportError"));
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "soundprint-user-data.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("exportError"));
    } finally {
      setExporting(false);
    }
  }, [t]);

  const runDeleteAccount = useCallback(async () => {
    if (!expectedPhrase || !deleteAccountPhraseOk) return;
    setDeleteAccountError(null);
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, phrase: deleteAccountPhraseInput }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (isRecentAuthRequiredError(data)) {
          setDeleteAccountError(t("recentAuthRequired"));
          redirectToRecentSignIn(window.location.pathname + window.location.search);
          return;
        }
        if (data.code === "PHRASE_MISMATCH") {
          setDeleteAccountError(t("phraseMismatch"));
        } else if (data.code === "NO_CONFIRMATION_PHRASE") {
          setDeleteAccountError(t("noPhraseError"));
        } else {
          setDeleteAccountError(data.error ?? t("deleteAccountError"));
        }
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setDeleteAccountError(t("deleteAccountError"));
    } finally {
      setDeletingAccount(false);
      setDeleteAccountUnderstood(false);
      setDeleteAccountPhraseInput("");
    }
  }, [deleteAccountPhraseInput, deleteAccountPhraseOk, expectedPhrase, router, t]);

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

  const outerClass = "mx-auto max-w-6xl space-y-8";

  const primarySaveClass =
    "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:bg-white dark:text-slate-950 dark:shadow-black/25 dark:hover:bg-slate-100 sm:w-auto";

  const mobileProps = {
    nameInput,
    onNameChange: (value: string) => {
      setNameInput(value);
      setProfileSaved(false);
      setProfileSaveError(null);
      if (value.length > 200) setNameFieldError(t("profileNameTooLong"));
      else setNameFieldError(null);
    },
    nameFieldError,
    accountEmail,
    avatarUrl,
    avatarUploading,
    avatarDeleting,
    avatarError,
    onAvatarSelect: (file: File | null | undefined) => {
      void uploadAvatar(file);
    },
    onAvatarDelete: () => {
      void deleteAvatar();
    },
    profileLoadError,
    profileSaveError,
    profileSaved,
    profileSaving,
    profileSaveDisabled,
    onSaveProfile: () => {
      void saveProfile();
    },
    hideGenreBanner,
    onHideGenreBannerChange: (next: boolean) => {
      if (next) setGenreBackfillBannerOptOut(true);
      else clearGenreBackfillBannerBlockingPrefs();
      setHideGenreBanner(next);
    },
    groqConsentGranted,
    publicProfileEligible,
    publicProfileGranted,
    privacyPrefsLoaded,
    privacySaving,
    privacyError,
    onGroqConsentChange: (next: boolean) => {
      void patchPrivacyPreference({ groqGenreConsent: next });
    },
    onPublicProfileChange: (next: boolean) => {
      void patchPrivacyPreference({ publicProfile: next });
    },
    expectedPhrase,
    phraseLoadError,
    phraseInput,
    onPhraseInputChange: (value: string) => {
      setPhraseInput(value);
      setError(null);
    },
    phraseOk,
    understood,
    onUnderstoodChange: (next: boolean) => {
      setUnderstood(next);
      setError(null);
    },
    clearing,
    clearError: error,
    onRunClear: () => {
      void runClear();
    },
  };

  if (!authReady) {
    return (
      <>
        <SettingsMobileSkeleton />
        <div className={`${outerClass} hidden lg:block`}>
          <div className="h-52 animate-pulse rounded-[2rem] border border-white/10 bg-gray-950 sm:h-60" aria-busy="true" />
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-white/10" />
            ))}
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`relative min-h-[200px] animate-pulse ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-busy="true">
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!userId) {
    return (
      <>
        <SettingsMobileSignedOut />
        <div className={`${outerClass} hidden lg:block`}>
          <SettingsHeroSignedOut />
        </div>
      </>
    );
  }

  return (
    <>
      <SettingsMobileExperience {...mobileProps} />
      <div className={`${outerClass} hidden lg:block`}>
      <SettingsHeroConnected />

      <nav
        className={`sticky ${SUBNAV_STICKY_TOP} z-20 -mx-1 mb-2 flex gap-2 overflow-x-auto overscroll-x-contain border-b border-slate-200/80 bg-white/85 px-1 pb-3 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] dark:border-white/10 dark:bg-slate-950/85 lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden`}
        aria-label={t("navOnThisPage")}
      >
        <a href="#settings-profile" className={`${DASHBOARD_SPOTLIGHT_PILL_MUTED} shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold no-underline transition hover:border-violet-300/50 hover:bg-white dark:hover:bg-white/15`}>
          {t("sectionProfile")}
        </a>
        <a href="#settings-preferences" className={`${DASHBOARD_SPOTLIGHT_PILL_MUTED} shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold no-underline transition hover:border-violet-300/50 hover:bg-white dark:hover:bg-white/15`}>
          {t("sectionPreferences")}
        </a>
        <a href="#settings-data-privacy" className={`${DASHBOARD_SPOTLIGHT_PILL_MUTED} shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold no-underline transition hover:border-violet-300/50 hover:bg-white dark:hover:bg-white/15`}>
          {t("sectionDataPrivacy")}
        </a>
      </nav>

      <div className="space-y-8">
        <section id="settings-profile" className="scroll-mt-28" aria-labelledby="settings-profile-heading">
          <SettingsSpotlightSection
            gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY}
            hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET}
            iconBgClass="border border-indigo-200/80 bg-indigo-50 dark:border-indigo-400/20 dark:bg-indigo-400/10"
            icon={<IconUser />}
            titleId="settings-profile-heading"
            heading={t("sectionProfile")}
            lead={t("sectionProfileLead")}
          >
            {profileLoadError ? (
              <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                {profileLoadError}
              </p>
            ) : (
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveProfile();
                }}
                noValidate
              >
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20 sm:flex-row sm:items-center">
                  <UserAvatar
                    src={avatarUrl}
                    name={nameInput}
                    email={accountEmail}
                    size="xl"
                    alt={t("profileImageAlt")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t("profileImageLabel")}</p>
                    <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("profileImageHint")}</p>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        void uploadAvatar(e.target.files?.[0]);
                      }}
                    />
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        className={DASHBOARD_SPOTLIGHT_BTN_SECONDARY}
                        disabled={avatarUploading || avatarDeleting}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" aria-hidden />
                        {avatarUploading
                          ? t("profileImageUploading")
                          : avatarUrl
                            ? t("profileImageReplace")
                            : t("profileImageUpload")}
                      </button>
                      {avatarUrl ? (
                        <button
                          type="button"
                          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200/80 bg-red-50 px-5 text-sm font-semibold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15 sm:w-auto"
                          disabled={avatarUploading || avatarDeleting}
                          onClick={() => {
                            void deleteAvatar();
                          }}
                        >
                          {avatarDeleting ? t("profileImageDeleting") : t("profileImageRemove")}
                        </button>
                      ) : null}
                    </div>
                    {avatarError ? (
                      <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                        {avatarError}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-display-name" className="text-sm font-medium text-slate-900 dark:text-white">
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
                    className={INPUT_CLASS}
                  />
                  {nameFieldError ? (
                    <p id="settings-name-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                      {nameFieldError}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("profileEmailLabel")}</p>
                  <p className="mt-2 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-600 dark:border-white/15 dark:bg-black/20 dark:text-slate-400">
                    {accountEmail ?? "—"}
                  </p>
                  <p className={`mt-1.5 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("profileEmailHint")}</p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-6 text-sm">
                    {profileSaved ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400" role="status">
                        {t("profileSaved")}
                      </span>
                    ) : null}
                    {profileSaveError ? (
                      <span className="font-medium text-red-600 dark:text-red-400" role="alert">
                        {profileSaveError}
                      </span>
                    ) : null}
                  </div>
                  <button type="submit" disabled={profileSaveDisabled} className={primarySaveClass}>
                    {profileSaving ? t("savingProfile") : t("saveProfile")}
                  </button>
                </div>
              </form>
            )}
          </SettingsSpotlightSection>
        </section>

        <section id="settings-preferences" className="scroll-mt-28" aria-labelledby="settings-preferences-heading">
          <SettingsSpotlightSection
            gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN}
            hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN}
            iconBgClass="border border-violet-200/80 bg-violet-50 dark:border-violet-400/20 dark:bg-violet-400/10"
            icon={<IconSliders />}
            titleId="settings-preferences-heading"
            heading={t("sectionPreferences")}
            lead={t("sectionPreferencesLead")}
          >
            <div className="flex flex-col gap-5">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("genreBannerTitle")}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("genreBannerDescription")}</p>
              </div>
              <div className={`flex flex-col gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:gap-6`}>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t("genreBannerHideLabel")}</p>
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

              <div className="border-t border-slate-200/80 pt-5 dark:border-white/10">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("groqConsentTitle")}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  {t("groqConsentDescription")}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("groqConsentLabel")}</p>
                  <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
                    {privacySaving ? (
                      <span className={`text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("groqConsentSaving")}</span>
                    ) : null}
                    <SettingsSwitch
                      aria-label={t("groqConsentLabel")}
                      checked={groqConsentGranted}
                      disabled={!privacyPrefsLoaded || privacySaving}
                      onChange={(next) => {
                        void patchPrivacyPreference({ groqGenreConsent: next });
                      }}
                    />
                  </div>
                </div>
              </div>

              {publicProfileEligible ? (
                <div className="border-t border-slate-200/80 pt-5 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("publicProfileTitle")}</h3>
                  <p className={`mt-1.5 text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                    {t("publicProfileDescription")}
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t("publicProfileLabel")}</p>
                    <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
                      {privacySaving ? (
                        <span className={`text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("publicProfileSaving")}</span>
                      ) : null}
                      <SettingsSwitch
                        aria-label={t("publicProfileLabel")}
                        checked={publicProfileGranted}
                        disabled={!privacyPrefsLoaded || privacySaving}
                        onChange={(next) => {
                          void patchPrivacyPreference({ publicProfile: next });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {privacyError ? (
                <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                  {privacyError}
                </p>
              ) : null}
            </div>
          </SettingsSpotlightSection>
        </section>

        <section id="settings-data-privacy" className="scroll-mt-28" aria-labelledby="settings-data-heading">
          <div className="mb-2">
            <h2 id="settings-data-heading" className="flex items-center gap-2.5 text-lg font-semibold text-slate-900 dark:text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200/80 bg-red-50 dark:border-red-400/25 dark:bg-red-400/10">
                <IconDataPrivacy />
              </span>
              {t("sectionDataPrivacy")}
            </h2>
            <p className={`mt-1.5 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("sectionDataPrivacyLead")}</p>
          </div>

          <SettingsSpotlightSection
            gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_TABLE}
            hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET}
            iconBgClass="border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-white/10"
            icon={<Upload className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden />}
            titleId="settings-import-heading"
            heading={t("importExportsTitle")}
            lead={t("importExportsBody")}
          >
            <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} no-underline inline-flex min-h-11 items-center`}>
              {t("importExportsCta")}
            </Link>
          </SettingsSpotlightSection>

          <div className="mt-8">
            <SettingsSpotlightSection
              gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN}
              hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN}
              iconBgClass="border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-white/10"
              icon={<Upload className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden />}
              titleId="settings-export-heading"
              heading={t("exportAllDataTitle")}
              lead={t("exportAllDataBody")}
            >
              {exportError ? (
                <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                  {exportError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void runExport()}
                disabled={exporting}
                className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} inline-flex min-h-11 items-center`}
              >
                {exporting ? t("exporting") : t("exportAllDataButton")}
              </button>
            </SettingsSpotlightSection>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-red-200/90 bg-gradient-to-b from-red-50/95 to-red-50/50 shadow-xl shadow-red-900/10 dark:border-red-900/50 dark:from-red-950/40 dark:to-red-950/15 dark:shadow-black/25">
            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} border-red-200/70 p-5 dark:border-red-900/40 sm:p-6`}>
              <h3 className="text-base font-semibold text-red-950 dark:text-red-200" id="danger-heading">
                {t("dangerTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-red-900/90 dark:text-red-200/90">{t("dangerBody")}</p>
              <ul className="mt-4 space-y-2 rounded-xl border border-red-200/60 bg-white/70 p-3 text-sm text-red-900/95 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-200/95">
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

            <div className="space-y-5 p-5 sm:p-6">
              {phraseLoadError ? (
                <p className="text-sm font-medium text-red-800 dark:text-red-300" role="alert">
                  {phraseLoadError}
                </p>
              ) : expectedPhrase ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{t("phraseInstruction")}</p>
                  <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} font-mono text-base font-semibold tracking-wide text-slate-900 dark:text-white`}>{expectedPhrase}</div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="deletion-confirmation-phrase">
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
                      className={`${INPUT_CLASS} font-mono`}
                    />
                    <p className={`mt-2 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("phraseHint")}</p>
                  </div>
                </div>
              ) : (
                <p className={DASHBOARD_SPOTLIGHT_MUTED}>{tCommon("pleaseWait")}</p>
              )}

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  understood
                    ? "border-violet-300/50 bg-violet-50/80 dark:border-violet-400/30 dark:bg-violet-950/25"
                    : "border-slate-200/90 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.04]"
                } ${!expectedPhrase || !!phraseLoadError ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/40 dark:border-white/20"
                  checked={understood}
                  onChange={(e) => {
                    setUnderstood(e.target.checked);
                    setError(null);
                  }}
                  disabled={!expectedPhrase || !!phraseLoadError}
                  aria-label={t("switchUnderstandAria")}
                />
                <span className="text-sm text-slate-900 dark:text-white">{t("confirmCheckbox")}</span>
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
                  disabled={!understood || !phraseOk || clearing || !!phraseLoadError || !expectedPhrase}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80 sm:w-auto"
                >
                  {clearing ? t("clearing") : t("clearDataButton")}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-red-300 bg-gradient-to-b from-red-100/90 to-red-50/60 shadow-xl shadow-red-900/15 dark:border-red-800 dark:from-red-950/50 dark:to-red-950/20">
            <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} border-red-300/70 p-5 dark:border-red-900/50 sm:p-6`}>
              <h3 className="text-base font-semibold text-red-950 dark:text-red-200">
                {t("deleteAccountTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-red-900/90 dark:text-red-200/90">
                {t("deleteAccountBody")}
              </p>
              <ul className="mt-4 space-y-2 rounded-xl border border-red-200/60 bg-white/70 p-3 text-sm text-red-900/95 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-200/95">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>•</span>
                  <span>{t("deleteAccountBulletProfile")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>•</span>
                  <span>{t("deleteAccountBulletSpotify")}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>•</span>
                  <span>{t("deleteAccountBulletAllData")}</span>
                </li>
              </ul>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              {expectedPhrase ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-800 dark:text-slate-200">{t("phraseInstruction")}</p>
                  <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} font-mono text-base font-semibold tracking-wide text-slate-900 dark:text-white`}>
                    {expectedPhrase}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="delete-account-confirmation-phrase">
                      {t("phraseLabel")}
                    </label>
                    <input
                      id="delete-account-confirmation-phrase"
                      type="text"
                      name="delete-account-confirmation-phrase"
                      autoComplete="off"
                      spellCheck={false}
                      value={deleteAccountPhraseInput}
                      onChange={(e) => {
                        setDeleteAccountPhraseInput(e.target.value);
                        setDeleteAccountError(null);
                      }}
                      placeholder={t("phrasePlaceholder")}
                      className={`${INPUT_CLASS} font-mono`}
                    />
                  </div>
                </div>
              ) : (
                <p className={DASHBOARD_SPOTLIGHT_MUTED}>{tCommon("pleaseWait")}</p>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors border-slate-200/90 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.04]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/40 dark:border-white/20"
                  checked={deleteAccountUnderstood}
                  onChange={(e) => {
                    setDeleteAccountUnderstood(e.target.checked);
                    setDeleteAccountError(null);
                  }}
                  disabled={!expectedPhrase || !!phraseLoadError}
                />
                <span className="text-sm text-slate-900 dark:text-white">{t("deleteAccountCheckbox")}</span>
              </label>
              {deleteAccountError ? (
                <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                  {deleteAccountError}
                </p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void runDeleteAccount()}
                  disabled={
                    !deleteAccountUnderstood ||
                    !deleteAccountPhraseOk ||
                    deletingAccount ||
                    !!phraseLoadError ||
                    !expectedPhrase
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-400 bg-red-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {deletingAccount ? t("deletingAccount") : t("deleteAccountButton")}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
