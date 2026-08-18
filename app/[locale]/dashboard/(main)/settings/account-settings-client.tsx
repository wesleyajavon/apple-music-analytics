"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
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
import { GroqAiSettingsFocus } from "@/lib/components/groq-ai-settings-focus";
import { AI_MASTER_QUERY_KEY } from "@/lib/hooks/use-ai-master-toggle";
import {
  DashboardSectionPanel,
  useDashboardSectionView,
} from "@/lib/components/dashboard-section-switcher";
import {
  SETTINGS_VIEWS,
  SettingsDangerSection,
  SettingsHeroSignedOut,
  SettingsIdentityHeader,
  SettingsPageSkeleton,
  SettingsPreferencesSection,
  SettingsProfileSection,
  SettingsViewNav,
  SettingsYourDataSection,
} from "./settings-sections";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type AccountSettingsClientProps = {
  gdprContactEmail?: string | null;
};

function AccountSettingsContent({ gdprContactEmail = null }: AccountSettingsClientProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeView, setView } = useDashboardSectionView(SETTINGS_VIEWS, "profile");
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

  const openPreferences = useCallback(() => {
    setView("preferences");
  }, [setView]);

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
    expectedPhrase != null && phraseInput.length > 0 && deletionPhrasesMatch(phraseInput, expectedPhrase);

  const deleteAccountPhraseOk =
    expectedPhrase != null &&
    deleteAccountPhraseInput.length > 0 &&
    deletionPhrasesMatch(deleteAccountPhraseInput, expectedPhrase);

  const nameDirty = initialName !== null && nameInput.trim() !== (initialName ?? "").trim();
  const profileSaveDisabled =
    initialName === null || !nameDirty || !!nameFieldError || profileSaving || !!profileLoadError;

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

  if (!authReady) {
    return <SettingsPageSkeleton />;
  }

  if (!userId) {
    return <SettingsHeroSignedOut />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <GroqAiSettingsFocus
        preferencesVisible={activeView === "preferences"}
        onOpenPreferences={openPreferences}
      />
      <SettingsIdentityHeader name={nameInput} email={accountEmail} avatarUrl={avatarUrl} saved={profileSaved} />
      <SettingsViewNav activeView={activeView} onChange={setView} />

      <DashboardSectionPanel view="profile" activeView={activeView} idPrefix="settings">
        <SettingsProfileSection
          profileLoadError={profileLoadError}
          avatarUrl={avatarUrl}
          nameInput={nameInput}
          accountEmail={accountEmail}
          avatarUploading={avatarUploading}
          avatarDeleting={avatarDeleting}
          avatarError={avatarError}
          onAvatarSelect={(file) => {
            void uploadAvatar(file);
          }}
          onAvatarDelete={() => {
            void deleteAvatar();
          }}
          onNameChange={(value) => {
            setNameInput(value);
            setProfileSaved(false);
            setProfileSaveError(null);
            if (value.length > 200) setNameFieldError(t("profileNameTooLong"));
            else setNameFieldError(null);
          }}
          nameFieldError={nameFieldError}
          onSaveProfile={() => {
            void saveProfile();
          }}
          profileSaveDisabled={profileSaveDisabled}
          profileSaving={profileSaving}
          profileSaved={profileSaved}
          profileSaveError={profileSaveError}
        />
      </DashboardSectionPanel>

      <DashboardSectionPanel view="preferences" activeView={activeView} idPrefix="settings">
        <SettingsPreferencesSection
          hideGenreBanner={hideGenreBanner}
          onHideGenreBannerChange={(next) => {
            if (next) setGenreBackfillBannerOptOut(true);
            else clearGenreBackfillBannerBlockingPrefs();
            setHideGenreBanner(next);
          }}
          groqConsentGranted={groqConsentGranted}
          onGroqConsentChange={(next) => {
            void patchPrivacyPreference({ groqGenreConsent: next });
          }}
          publicProfileEligible={publicProfileEligible}
          publicProfileGranted={publicProfileGranted}
          onPublicProfileChange={(next) => {
            void patchPrivacyPreference({ publicProfile: next });
          }}
          privacyPrefsLoaded={privacyPrefsLoaded}
          privacySaving={privacySaving}
          privacyError={privacyError}
        />
      </DashboardSectionPanel>

      <DashboardSectionPanel view="data" activeView={activeView} idPrefix="settings">
        <SettingsYourDataSection
          gdprContactEmail={gdprContactEmail}
          exportError={exportError}
          exporting={exporting}
          onExport={() => {
            void runExport();
          }}
        />
      </DashboardSectionPanel>

      <DashboardSectionPanel view="danger" activeView={activeView} idPrefix="settings">
        <SettingsDangerSection
          expectedPhrase={expectedPhrase}
          phraseLoadError={phraseLoadError}
          phraseInput={phraseInput}
          onPhraseInputChange={(value) => {
            setPhraseInput(value);
            setError(null);
          }}
          phraseOk={phraseOk}
          understood={understood}
          onUnderstoodChange={(next) => {
            setUnderstood(next);
            setError(null);
          }}
          clearing={clearing}
          clearError={error}
          onRunClear={() => {
            void runClear();
          }}
          deleteAccountPhraseInput={deleteAccountPhraseInput}
          onDeleteAccountPhraseChange={(value) => {
            setDeleteAccountPhraseInput(value);
            setDeleteAccountError(null);
          }}
          deleteAccountPhraseOk={deleteAccountPhraseOk}
          deleteAccountUnderstood={deleteAccountUnderstood}
          onDeleteAccountUnderstoodChange={(next) => {
            setDeleteAccountUnderstood(next);
            setDeleteAccountError(null);
          }}
          deletingAccount={deletingAccount}
          deleteAccountError={deleteAccountError}
          onDeleteAccount={() => {
            void runDeleteAccount();
          }}
        />
      </DashboardSectionPanel>
    </div>
  );
}

export function AccountSettingsClient(props: AccountSettingsClientProps) {
  return (
    <Suspense fallback={<SettingsPageSkeleton />}>
      <AccountSettingsContent {...props} />
    </Suspense>
  );
}
