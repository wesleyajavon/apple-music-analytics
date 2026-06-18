"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileJson, LayoutDashboard, Settings2, ShieldCheck, SlidersHorizontal, Upload, UserRound } from "lucide-react";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
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
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
} from "@/lib/constants/dashboard-spotlight";
import {
  SettingsMobileExperience,
  SettingsMobileSignedOut,
  SettingsMobileSkeleton,
} from "./settings-mobile";
import {
  SettingsDataCard,
  SettingsPageNav,
  SettingsSectionHeader,
  SettingsToggleRow,
} from "./settings-shared";
import { GroqAiSettingsFocus } from "@/lib/components/groq-ai-settings-focus";
import { DuetShareSettingsSection } from "@/lib/components/duet/duet-share-settings-section";
import { DashboardDataExportsSection } from "@/lib/components/dashboard-data-exports-section";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";
import { AI_MASTER_QUERY_KEY } from "@/lib/hooks/use-ai-master-toggle";

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

const SETTINGS_CONTROLS_PILLARS = [
  {
    titleKey: "heroTrust1Title",
    bodyKey: "heroTrust1",
    icon: UserRound,
    iconClass:
      "border-violet-300/30 bg-gradient-to-br from-violet-500/30 to-violet-400/10 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,0.28)]",
  },
  {
    titleKey: "heroTrust2Title",
    bodyKey: "heroTrust2",
    icon: SlidersHorizontal,
    iconClass:
      "border-cyan-300/30 bg-gradient-to-br from-cyan-500/25 to-cyan-400/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.22)]",
  },
  {
    titleKey: "heroTrust3Title",
    bodyKey: "heroTrust3",
    icon: ShieldCheck,
    iconClass:
      "border-emerald-300/30 bg-gradient-to-br from-emerald-500/25 to-emerald-400/10 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.22)]",
  },
] as const;

function SettingsControlsPanel() {
  const t = useTranslations("settings");

  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/20 bg-gradient-to-br from-white/15 via-white/5 to-transparent p-px shadow-2xl shadow-violet-500/25 backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-[1.72rem] bg-slate-950/90 p-5 sm:p-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.14),transparent_38%)]"
            aria-hidden
          />
          <div className="relative flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-500/35 via-violet-400/15 to-cyan-400/10 shadow-lg shadow-violet-500/25">
              <Settings2 className="h-5 w-5 text-violet-50" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold tracking-[-0.03em] text-white">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-emerald-300/35 bg-emerald-400/12 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-emerald-100">
                  {t("heroStatTag")}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-white/60">{t("heroTrustPanelHint")}</p>
            </div>
          </div>

          <ul className="relative mt-5 space-y-2.5">
            {SETTINGS_CONTROLS_PILLARS.map(({ titleKey, bodyKey, icon: Icon, iconClass }) => (
              <li
                key={titleKey}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5 transition-colors hover:border-white/16 hover:bg-white/[0.07]"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={2.1} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-white">{t(titleKey)}</p>
                  <p className="mt-0.5 text-sm leading-5 text-white/65">{t(bodyKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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
            <LiveStatusDot />
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

        <SettingsControlsPanel />
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

function IconUser() {
  return (
    <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21a8 8 0 00-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

type AccountSettingsClientProps = {
  gdprContactEmail?: string | null;
};

export function AccountSettingsClient({ gdprContactEmail = null }: AccountSettingsClientProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
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
        if (payload.groqGenreConsent !== undefined) {
          void queryClient.invalidateQueries({ queryKey: AI_MASTER_QUERY_KEY });
        }
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
    [t, queryClient]
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
      <GroqAiSettingsFocus />
      <SettingsMobileExperience {...mobileProps} />
      <div className={`${outerClass} hidden lg:block`}>
      <SettingsHeroConnected />

      <SettingsPageNav
        ariaLabel={t("navOnThisPage")}
        items={[
          { href: "#settings-profile", label: t("sectionProfile") },
          { href: "#settings-preferences", label: t("sectionPreferences") },
          { href: "#settings-your-data", label: t("sectionYourData") },
          { href: "#settings-danger", label: t("sectionDanger") },
        ]}
      />

      <div className="space-y-12">
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
            <div className="space-y-3">
              <SettingsToggleRow
                title={t("genreBannerHideLabel")}
                hint={t("genreBannerHint")}
                checked={hideGenreBanner}
                aria-label={t("switchHideGenreAria")}
                onChange={(next) => {
                  if (next) setGenreBackfillBannerOptOut(true);
                  else clearGenreBackfillBannerBlockingPrefs();
                  setHideGenreBanner(next);
                }}
              />

              <div id={GROQ_AI_CONSENT_SETTINGS_HASH} className="scroll-mt-28 space-y-2">
                <SettingsToggleRow
                  title={t("groqConsentLabel")}
                  hint={t("groqConsentHint")}
                  checked={groqConsentGranted}
                  disabled={!privacyPrefsLoaded || privacySaving}
                  saving={privacySaving}
                  savingLabel={t("groqConsentSaving")}
                  aria-label={t("groqConsentLabel")}
                  onChange={(next) => {
                    void patchPrivacyPreference({ groqGenreConsent: next });
                  }}
                />
              </div>

              {publicProfileEligible ? (
                <SettingsToggleRow
                  title={t("publicProfileLabel")}
                  hint={t("publicProfileHint")}
                  checked={publicProfileGranted}
                  disabled={!privacyPrefsLoaded || privacySaving}
                  saving={privacySaving}
                  savingLabel={t("publicProfileSaving")}
                  aria-label={t("publicProfileLabel")}
                  onChange={(next) => {
                    void patchPrivacyPreference({ publicProfile: next });
                  }}
                />
              ) : null}

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-black/15">
                <DuetShareSettingsSection />
              </div>

              {privacyError ? (
                <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                  {privacyError}
                </p>
              ) : null}
            </div>
          </SettingsSpotlightSection>
        </section>

        <section id="settings-your-data" className="scroll-mt-28" aria-labelledby="settings-your-data-heading">
          <SettingsSectionHeader
            id="settings-your-data-heading"
            title={t("sectionYourData")}
            lead={t("sectionYourDataLead")}
          >
            {gdprContactEmail ? (
              <p className={`mt-3 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                {t("gdprContactLead")}{" "}
                <a
                  href={`mailto:${gdprContactEmail}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {gdprContactEmail}
                </a>
              </p>
            ) : null}
          </SettingsSectionHeader>

          <div className="grid gap-4">
            <SettingsDataCard
              icon={<Upload className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden />}
              title={t("importExportsTitle")}
              body={t("importExportsBodyShort")}
            >
              <Link
                href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
                className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} no-underline inline-flex min-h-11 items-center`}
              >
                {t("importExportsCta")}
              </Link>
            </SettingsDataCard>

            <SettingsDataCard
              icon={<Download className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden />}
              title={t("dashboardExportsTitle")}
              body={t("dashboardExportsBodyShort")}
            >
              <DashboardDataExportsSection variant="embedded" />
            </SettingsDataCard>

            <SettingsDataCard
              icon={<FileJson className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden />}
              title={t("exportAllDataTitle")}
              body={t("exportAllDataBodyShort")}
            >
              {exportError ? (
                <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
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
            </SettingsDataCard>
          </div>
        </section>

        <section id="settings-danger" className="scroll-mt-28" aria-labelledby="settings-danger-heading">
          <SettingsSectionHeader
            id="settings-danger-heading"
            title={t("sectionDanger")}
            lead={t("sectionDangerLead")}
            tone="danger"
          />

          <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-red-200/90 bg-gradient-to-b from-red-50/95 to-red-50/50 shadow-xl shadow-red-900/10 dark:border-red-900/50 dark:from-red-950/40 dark:to-red-950/15 dark:shadow-black/25">
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

          <div className="overflow-hidden rounded-[2rem] border border-red-300 bg-gradient-to-b from-red-100/90 to-red-50/60 shadow-xl shadow-red-900/15 dark:border-red-800 dark:from-red-950/50 dark:to-red-950/20">
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
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
