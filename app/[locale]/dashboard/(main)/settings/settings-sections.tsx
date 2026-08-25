"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Download, FileJson, ShieldAlert, SlidersHorizontal, Upload, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DuetShareSettingsSection } from "@/lib/components/duet/duet-share-settings-section";
import { DashboardDataExportsSection } from "@/lib/components/dashboard-data-exports-section";
import {
  DashboardSectionSwitcher,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import { DUET_SHARE_SETTINGS_HASH } from "@/lib/constants/duet-settings";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import {
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_SHELL,
} from "@/lib/constants/dashboard-spotlight";
import {
  SETTINGS_INPUT_CLASS,
  SETTINGS_PRIMARY_SAVE_CLASS,
  DangerPhraseFields,
  SettingsDataCard,
  SettingsSectionHeader,
  SettingsToggleRow,
} from "./settings-shared";

export const SETTINGS_VIEWS = ["profile", "preferences", "data", "danger"] as const;
export type SettingsView = (typeof SETTINGS_VIEWS)[number];

const SETTINGS_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 px-5 py-5 text-white shadow-2xl shadow-violet-500/15 sm:rounded-[2rem] sm:px-8 sm:py-6";

const SUBNAV_STICKY_TOP = "top-[calc(var(--dashboard-filter-height,4.5rem)+0.5rem)]";

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
    <div className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
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

export function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
      <div className="h-36 animate-pulse rounded-[1.75rem] border border-white/10 bg-gray-950 sm:h-40" />
      <div className="h-16 animate-pulse rounded-[1.5rem] border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950" />
      <div className={`relative min-h-[220px] animate-pulse ${DASHBOARD_SPOTLIGHT_SHELL}`}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
      </div>
    </div>
  );
}

export function SettingsHeroSignedOut() {
  const t = useTranslations("settings");

  return (
    <div className="mx-auto max-w-6xl">
      <div className={SETTINGS_HERO_SHELL_CLASS}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(251,191,36,0.18),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
        <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]" />
            {t("signedOutHeroEyebrow")}
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.06em] text-balance sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">{t("signedOutHint")}</p>
          <Link
            href="/sign-in"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 sm:w-auto"
          >
            {t("signInCta")}
          </Link>
          <ul className="mt-6 space-y-2 text-sm leading-6 text-white/70">
            {(["signedOutTrust1", "signedOutTrust2", "signedOutTrust3"] as const).map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function SettingsIdentityHeader({
  name,
  email,
  avatarUrl,
  saved,
}: {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  saved: boolean;
}) {
  const t = useTranslations("settings");
  const displayName = name.trim();

  return (
    <div className={SETTINGS_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <UserAvatar src={avatarUrl} name={name} email={email} size="lg" alt={t("profileImageAlt")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-100">
              <LiveStatusDot />
              {t("heroEyebrow")}
            </span>
            {saved ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                {t("profileSaved")}
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-balance sm:text-3xl">
            {displayName || t("title")}
          </h1>
          {email ? (
            <p className="mt-1 truncate text-sm text-white/60" title={email}>
              {email}
            </p>
          ) : null}
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">{t("subtitle")}</p>
        </div>
      </div>
    </div>
  );
}

export function SettingsViewNav({
  activeView,
  onChange,
}: {
  activeView: SettingsView;
  onChange: (view: SettingsView) => void;
}) {
  const t = useTranslations("settings");
  const items: DashboardSectionItem<SettingsView>[] = [
    { id: "profile", label: t("sectionProfile"), icon: UserRound },
    { id: "preferences", label: t("sectionPreferences"), icon: SlidersHorizontal },
    { id: "data", label: t("sectionYourData"), icon: Download },
    { id: "danger", label: t("sectionDanger"), icon: ShieldAlert },
  ];

  return (
    <div
      className={`sticky ${SUBNAV_STICKY_TOP} z-20 -mx-1 space-y-2 bg-slate-50/90 px-1 py-2 backdrop-blur-md dark:bg-slate-950/85`}
    >
      <DashboardSectionSwitcher
        items={items}
        activeView={activeView}
        onChange={onChange}
        idPrefix="settings"
        navLabel={t("viewSwitcher.navLabel")}
      />
      <p className={`px-1 text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("viewSwitcher.hint")}</p>
    </div>
  );
}

export function SettingsProfileSection({
  profileLoadError,
  avatarUrl,
  nameInput,
  accountEmail,
  avatarUploading,
  avatarDeleting,
  avatarError,
  onAvatarSelect,
  onAvatarDelete,
  onNameChange,
  nameFieldError,
  onSaveProfile,
  profileSaveDisabled,
  profileSaving,
  profileSaved,
  profileSaveError,
}: {
  profileLoadError: string | null;
  avatarUrl: string | null;
  nameInput: string;
  accountEmail: string | null;
  avatarUploading: boolean;
  avatarDeleting: boolean;
  avatarError: string | null;
  onAvatarSelect: (file: File | null | undefined) => void;
  onAvatarDelete: () => void;
  onNameChange: (value: string) => void;
  nameFieldError: string | null;
  onSaveProfile: () => void;
  profileSaveDisabled: boolean;
  profileSaving: boolean;
  profileSaved: boolean;
  profileSaveError: string | null;
}) {
  const t = useTranslations("settings");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  return (
    <SettingsSpotlightSection
      gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY}
      hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET}
      iconBgClass="border border-indigo-200/80 bg-indigo-50 dark:border-indigo-400/20 dark:bg-indigo-400/10"
      icon={<UserRound className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden />}
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
            onSaveProfile();
          }}
          noValidate
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-center dark:border-white/10 dark:bg-black/20 sm:flex-row sm:items-center sm:text-left">
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
                  onAvatarSelect(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} min-h-11 w-full sm:w-auto`}
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
                    onClick={onAvatarDelete}
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
              onChange={(e) => onNameChange(e.target.value)}
              aria-invalid={!!nameFieldError}
              aria-describedby={nameFieldError ? "settings-name-error" : undefined}
              className={SETTINGS_INPUT_CLASS}
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
            <button type="submit" disabled={profileSaveDisabled} className={SETTINGS_PRIMARY_SAVE_CLASS}>
              {profileSaving ? t("savingProfile") : t("saveProfile")}
            </button>
          </div>
        </form>
      )}
    </SettingsSpotlightSection>
  );
}

export function SettingsPreferencesSection({
  hideGenreBanner,
  onHideGenreBannerChange,
  groqConsentGranted,
  onGroqConsentChange,
  publicProfileEligible,
  publicProfileGranted,
  onPublicProfileChange,
  privacyPrefsLoaded,
  privacySaving,
  privacyError,
}: {
  hideGenreBanner: boolean;
  onHideGenreBannerChange: (next: boolean) => void;
  groqConsentGranted: boolean;
  onGroqConsentChange: (next: boolean) => void;
  publicProfileEligible: boolean;
  publicProfileGranted: boolean;
  onPublicProfileChange: (next: boolean) => void;
  privacyPrefsLoaded: boolean;
  privacySaving: boolean;
  privacyError: string | null;
}) {
  const t = useTranslations("settings");

  return (
    <SettingsSpotlightSection
      gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN}
      hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN}
      iconBgClass="border border-violet-200/80 bg-violet-50 dark:border-violet-400/20 dark:bg-violet-400/10"
      icon={<SlidersHorizontal className="h-5 w-5 text-violet-600 dark:text-violet-300" aria-hidden />}
      titleId="settings-preferences-heading"
      heading={t("sectionPreferences")}
      lead={t("sectionPreferencesLead")}
    >
      <div className="space-y-3">
        <SettingsToggleRow
          title={t("genreBannerHideLabel")}
          hint={t("genreBannerHint")}
          checked={hideGenreBanner}
          ariaLabel={t("switchHideGenreAria")}
          onChange={onHideGenreBannerChange}
        />

        <div id={GROQ_AI_CONSENT_SETTINGS_HASH} className="scroll-mt-28 space-y-2">
          <SettingsToggleRow
            title={t("groqConsentLabel")}
            hint={t("groqConsentHint")}
            checked={groqConsentGranted}
            disabled={!privacyPrefsLoaded || privacySaving}
            saving={privacySaving}
            savingLabel={t("groqConsentSaving")}
            ariaLabel={t("groqConsentLabel")}
            onChange={onGroqConsentChange}
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
            ariaLabel={t("publicProfileLabel")}
            onChange={onPublicProfileChange}
          />
        ) : null}

        <div
          id={DUET_SHARE_SETTINGS_HASH}
          className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-black/15"
        >
          <DuetShareSettingsSection />
        </div>

        {privacyError ? (
          <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {privacyError}
          </p>
        ) : null}
      </div>
    </SettingsSpotlightSection>
  );
}

export function SettingsYourDataSection({
  gdprContactEmail,
  exportError,
  exporting,
  onExport,
}: {
  gdprContactEmail?: string | null;
  exportError: string | null;
  exporting: boolean;
  onExport: () => void;
}) {
  const t = useTranslations("settings");

  return (
    <section aria-labelledby="settings-your-data-heading">
      <SettingsSectionHeader id="settings-your-data-heading" title={t("sectionYourData")} lead={t("sectionYourDataLead")}>
        {gdprContactEmail ? (
          <p className={`mt-3 text-sm ${DASHBOARD_SPOTLIGHT_MUTED}`}>
            {t("gdprContactLead")}{" "}
            <a href={`mailto:${gdprContactEmail}`} className="font-medium text-primary underline-offset-2 hover:underline">
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
            className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} inline-flex min-h-11 w-full items-center justify-center no-underline sm:w-auto`}
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
            onClick={onExport}
            disabled={exporting}
            className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} inline-flex min-h-11 w-full items-center justify-center sm:w-auto`}
          >
            {exporting ? t("exporting") : t("exportAllDataButton")}
          </button>
        </SettingsDataCard>
      </div>
    </section>
  );
}

export function SettingsDangerSection({
  expectedPhrase,
  phraseLoadError,
  phraseInput,
  onPhraseInputChange,
  phraseOk,
  understood,
  onUnderstoodChange,
  clearing,
  clearError,
  onRunClear,
  deleteAccountPhraseInput,
  onDeleteAccountPhraseChange,
  deleteAccountPhraseOk,
  deleteAccountUnderstood,
  onDeleteAccountUnderstoodChange,
  deletingAccount,
  deleteAccountError,
  onDeleteAccount,
}: {
  expectedPhrase: string | null;
  phraseLoadError: string | null;
  phraseInput: string;
  onPhraseInputChange: (value: string) => void;
  phraseOk: boolean;
  understood: boolean;
  onUnderstoodChange: (next: boolean) => void;
  clearing: boolean;
  clearError: string | null;
  onRunClear: () => void;
  deleteAccountPhraseInput: string;
  onDeleteAccountPhraseChange: (value: string) => void;
  deleteAccountPhraseOk: boolean;
  deleteAccountUnderstood: boolean;
  onDeleteAccountUnderstoodChange: (next: boolean) => void;
  deletingAccount: boolean;
  deleteAccountError: string | null;
  onDeleteAccount: () => void;
}) {
  const t = useTranslations("settings");
  const phraseDisabled = !expectedPhrase || !!phraseLoadError;

  return (
    <section aria-labelledby="settings-danger-heading">
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
              {(["dangerBulletListens", "dangerBulletReplay", "dangerBulletOnboarding"] as const).map((key) => (
                <li key={key} className="flex gap-2">
                  <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>
                    •
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <DangerPhraseFields
              expectedPhrase={expectedPhrase}
              phraseLoadError={phraseLoadError}
              phraseInput={phraseInput}
              onPhraseInputChange={onPhraseInputChange}
              inputId="deletion-confirmation-phrase"
            />

            <label
              className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                understood
                  ? "border-violet-300/50 bg-violet-50/80 dark:border-violet-400/30 dark:bg-violet-950/25"
                  : "border-slate-200/90 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.04]"
              } ${phraseDisabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/40 dark:border-white/20"
                checked={understood}
                onChange={(e) => onUnderstoodChange(e.target.checked)}
                disabled={phraseDisabled}
                aria-label={t("switchUnderstandAria")}
              />
              <span className="text-sm text-slate-900 dark:text-white">{t("confirmCheckbox")}</span>
            </label>

            {clearError ? (
              <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                {clearError}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onRunClear}
                disabled={!understood || !phraseOk || clearing || phraseDisabled}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80 sm:w-auto"
              >
                {clearing ? t("clearing") : t("clearDataButton")}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-red-300 bg-gradient-to-b from-red-100/90 to-red-50/60 shadow-xl shadow-red-900/15 dark:border-red-800 dark:from-red-950/50 dark:to-red-950/20">
          <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} border-red-300/70 p-5 dark:border-red-900/50 sm:p-6`}>
            <h3 className="text-base font-semibold text-red-950 dark:text-red-200">{t("deleteAccountTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-red-900/90 dark:text-red-200/90">{t("deleteAccountBody")}</p>
            <ul className="mt-4 space-y-2 rounded-xl border border-red-200/60 bg-white/70 p-3 text-sm text-red-900/95 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-200/95">
              {(["deleteAccountBulletProfile", "deleteAccountBulletSpotify", "deleteAccountBulletAllData"] as const).map(
                (key) => (
                  <li key={key} className="flex gap-2">
                    <span className="mt-0.5 text-red-500 dark:text-red-400" aria-hidden>
                      •
                    </span>
                    <span>{t(key)}</span>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <DangerPhraseFields
              expectedPhrase={expectedPhrase}
              phraseLoadError={phraseLoadError}
              phraseInput={deleteAccountPhraseInput}
              onPhraseInputChange={onDeleteAccountPhraseChange}
              inputId="delete-account-confirmation-phrase"
            />
            <label
              className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                deleteAccountUnderstood
                  ? "border-violet-300/50 bg-violet-50/80 dark:border-violet-400/30 dark:bg-violet-950/25"
                  : "border-slate-200/90 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.04]"
              } ${phraseDisabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/40 dark:border-white/20"
                checked={deleteAccountUnderstood}
                onChange={(e) => onDeleteAccountUnderstoodChange(e.target.checked)}
                disabled={phraseDisabled}
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
                onClick={onDeleteAccount}
                disabled={
                  !deleteAccountUnderstood || !deleteAccountPhraseOk || deletingAccount || phraseDisabled
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
  );
}
