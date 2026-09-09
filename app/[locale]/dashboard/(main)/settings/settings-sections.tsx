"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Download, FileJson, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DuetShareSettingsSection } from "@/lib/components/duet/duet-share-settings-section";
import { DashboardDataExportsSection } from "@/lib/components/dashboard-data-exports-section";
import {
  DashboardSectionSwitcher,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { DUET_SHARE_SETTINGS_HASH } from "@/lib/constants/duet-settings";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
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

const SUBNAV_STICKY_TOP = "top-[calc(var(--dashboard-filter-height,4.5rem)+0.5rem)]";

function SettingsCanvasSection({
  titleId,
  heading,
  lead,
  children,
  tone = "default",
}: {
  titleId: string;
  heading: string;
  lead: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  const titleClass = tone === "danger" ? "text-red-700 dark:text-red-300" : "text-foreground";
  const leadClass = tone === "danger" ? "text-red-800/80 dark:text-red-200/80" : "text-muted";

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <div className="border-b border-glass-hairline pb-4">
        <h2 id={titleId} className={`${DASHBOARD_SECTION_TITLE} ${titleClass}`}>
          {heading}
        </h2>
        <p className={`mt-2 max-w-2xl text-[13px] leading-6 ${leadClass}`}>{lead}</p>
      </div>
      {children}
    </section>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
      <div className="h-24 animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/10" />
      <div className="h-12 animate-pulse rounded-xl bg-slate-200/60 dark:bg-white/5" />
      <div className="min-h-[220px] animate-pulse rounded-xl bg-slate-200/60 dark:bg-white/5" />
    </div>
  );
}

export function SettingsHeroSignedOut() {
  const t = useTranslations("settings");

  return (
    <div className="mx-auto max-w-6xl">
      <OverviewHeroFrame title={t("title")} description={t("signedOutHint")}>
        <p className={`mt-4 ${DASHBOARD_SECTION_EYEBROW}`}>{t("signedOutHeroEyebrow")}</p>
        <Link href="/sign-in" className={`${DASHBOARD_BTN_OUTLINE} mt-5 w-full no-underline sm:w-auto`}>
          {t("signInCta")}
        </Link>
        <ul className="mt-6 max-w-2xl space-y-1.5 text-[13px] leading-5 text-muted">
          {(["signedOutTrust1", "signedOutTrust2", "signedOutTrust3"] as const).map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
      </OverviewHeroFrame>
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
    <OverviewHeroFrame
      title={displayName || t("title")}
      description={t("subtitle")}
      avatarUrl={avatarUrl}
    >
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`${DASHBOARD_SECTION_EYEBROW} inline-flex items-center gap-2`}>
          <LiveStatusDot />
          {t("heroEyebrow")}
        </span>
        {saved ? (
          <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400" role="status">
            {t("profileSaved")}
          </span>
        ) : null}
      </div>
      {email ? (
        <p className="mt-2 truncate text-sm text-muted" title={email}>
          {email}
        </p>
      ) : null}
    </OverviewHeroFrame>
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
    { id: "profile", label: t("sectionProfile") },
    { id: "preferences", label: t("sectionPreferences") },
    { id: "data", label: t("sectionYourData") },
    { id: "danger", label: t("sectionDanger") },
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
      <p className="px-1 text-xs leading-relaxed text-muted">{t("viewSwitcher.hint")}</p>
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
    <SettingsCanvasSection
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
          <div className="flex flex-col items-center gap-4 border-b border-glass-hairline pb-5 text-center sm:flex-row sm:items-center sm:text-left">
            <UserAvatar
              src={avatarUrl}
              name={nameInput}
              email={accountEmail}
              size="xl"
              alt={t("profileImageAlt")}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t("profileImageLabel")}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t("profileImageHint")}</p>
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
                  className={`${DASHBOARD_BTN_OUTLINE} w-full sm:w-auto`}
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
                    className={`${DASHBOARD_BTN_GHOST} w-full text-red-700 dark:text-red-300 sm:w-auto`}
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
            <p className="text-sm font-medium text-foreground">{t("profileEmailLabel")}</p>
            <p className="mt-2 border-y border-glass-hairline py-2.5 text-sm text-muted">
              {accountEmail ?? "—"}
            </p>
            <p className="mt-1.5 text-xs text-muted">{t("profileEmailHint")}</p>
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
    </SettingsCanvasSection>
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
    <SettingsCanvasSection
      titleId="settings-preferences-heading"
      heading={t("sectionPreferences")}
      lead={t("sectionPreferencesLead")}
    >
      <div>
        <SettingsToggleRow
          title={t("genreBannerHideLabel")}
          hint={t("genreBannerHint")}
          checked={hideGenreBanner}
          ariaLabel={t("switchHideGenreAria")}
          onChange={onHideGenreBannerChange}
        />

        <div id={GROQ_AI_CONSENT_SETTINGS_HASH} className="scroll-mt-28">
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

        <div id={DUET_SHARE_SETTINGS_HASH} className="scroll-mt-28 border-t border-glass-hairline py-4">
          <DuetShareSettingsSection />
        </div>

        {privacyError ? (
          <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {privacyError}
          </p>
        ) : null}
      </div>
    </SettingsCanvasSection>
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
          <p className="mt-3 text-sm text-muted">
            {t("gdprContactLead")}{" "}
            <a href={`mailto:${gdprContactEmail}`} className="font-medium text-primary underline-offset-2 hover:underline">
              {gdprContactEmail}
            </a>
          </p>
        ) : null}
      </SettingsSectionHeader>

      <div>
        <SettingsDataCard
          icon={<Upload className="h-5 w-5" aria-hidden />}
          title={t("importExportsTitle")}
          body={t("importExportsBodyShort")}
        >
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className={`${DASHBOARD_BTN_OUTLINE} inline-flex w-full no-underline sm:w-auto`}
          >
            {t("importExportsCta")}
          </Link>
        </SettingsDataCard>

        <SettingsDataCard
          icon={<Download className="h-5 w-5" aria-hidden />}
          title={t("dashboardExportsTitle")}
          body={t("dashboardExportsBodyShort")}
        >
          <DashboardDataExportsSection variant="embedded" />
        </SettingsDataCard>

        <SettingsDataCard
          icon={<FileJson className="h-5 w-5" aria-hidden />}
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
            className={`${DASHBOARD_BTN_OUTLINE} inline-flex w-full sm:w-auto`}
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
    <SettingsCanvasSection
      titleId="settings-danger-heading"
      heading={t("sectionDanger")}
      lead={t("sectionDangerLead")}
      tone="danger"
    >
      <div className="space-y-8">
        <div className="space-y-5 border-b border-glass-hairline pb-8">
          <div>
            <h3 className="text-base font-semibold text-red-800 dark:text-red-200" id="danger-heading">
              {t("dangerTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("dangerBody")}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground">
              {(["dangerBulletListens", "dangerBulletReplay", "dangerBulletOnboarding"] as const).map((key) => (
                <li key={key} className="flex gap-2">
                  <span className="text-red-500 dark:text-red-400" aria-hidden>
                    •
                  </span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <DangerPhraseFields
            expectedPhrase={expectedPhrase}
            phraseLoadError={phraseLoadError}
            phraseInput={phraseInput}
            onPhraseInputChange={onPhraseInputChange}
            inputId="deletion-confirmation-phrase"
          />

          <label
            className={`flex min-h-11 cursor-pointer items-start gap-3 py-3 ${
              phraseDisabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 rounded border-glass-hairline text-foreground focus:ring-ring"
              checked={understood}
              onChange={(e) => onUnderstoodChange(e.target.checked)}
              disabled={phraseDisabled}
              aria-label={t("switchUnderstandAria")}
            />
            <span className="text-sm text-foreground">{t("confirmCheckbox")}</span>
          </label>

          {clearError ? (
            <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
              {clearError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onRunClear}
              disabled={!understood || !phraseOk || clearing || phraseDisabled}
              className={`${DASHBOARD_BTN_OUTLINE} w-full border-red-300 text-red-700 dark:border-red-800 dark:text-red-200 sm:w-auto`}
            >
              {clearing ? t("clearing") : t("clearDataButton")}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-red-800 dark:text-red-200">{t("deleteAccountTitle")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("deleteAccountBody")}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground">
              {(["deleteAccountBulletProfile", "deleteAccountBulletSpotify", "deleteAccountBulletAllData"] as const).map(
                (key) => (
                  <li key={key} className="flex gap-2">
                    <span className="text-red-500 dark:text-red-400" aria-hidden>
                      •
                    </span>
                    <span>{t(key)}</span>
                  </li>
                )
              )}
            </ul>
          </div>
          <DangerPhraseFields
            expectedPhrase={expectedPhrase}
            phraseLoadError={phraseLoadError}
            phraseInput={deleteAccountPhraseInput}
            onPhraseInputChange={onDeleteAccountPhraseChange}
            inputId="delete-account-confirmation-phrase"
          />
          <label
            className={`flex min-h-11 cursor-pointer items-start gap-3 py-3 ${
              phraseDisabled ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 rounded border-glass-hairline text-foreground focus:ring-ring"
              checked={deleteAccountUnderstood}
              onChange={(e) => onDeleteAccountUnderstoodChange(e.target.checked)}
              disabled={phraseDisabled}
            />
            <span className="text-sm text-foreground">{t("deleteAccountCheckbox")}</span>
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
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {deletingAccount ? t("deletingAccount") : t("deleteAccountButton")}
            </button>
          </div>
        </div>
      </div>
    </SettingsCanvasSection>
  );
}
