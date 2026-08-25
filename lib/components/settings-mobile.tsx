"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DangerPhraseFields,
  SETTINGS_INPUT_CLASS,
  SETTINGS_PRIMARY_SAVE_CLASS,
  SettingsSwitch,
} from "@/app/[locale]/dashboard/(main)/settings/settings-shared";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import { DUET_SHARE_SETTINGS_HASH } from "@/lib/constants/duet-settings";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";
import { useDashboardExports } from "@/lib/hooks/use-dashboard-exports";
import { useDuetMutations, useDuetSettings } from "@/lib/hooks/use-duet";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import type { DuetShareScope } from "@prisma/client";

const MOBILE_BLEED =
  `-mx-4 -mt-4 space-y-5 lg:hidden max-lg:pb-[max(2rem,calc(var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR},0px)+1.5rem))]`;
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const GROUP_SHELL = "divide-y divide-card-border overflow-hidden rounded-2xl border border-card-border bg-card-surface";
const ROW_CLASS =
  "flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm font-medium text-foreground";

export const SETTINGS_MOBILE_GROUP_IDS = {
  account: "settings-mobile-account",
  data: "settings-mobile-data",
  ai: "settings-mobile-ai",
  demo: "settings-mobile-demo",
  danger: "settings-mobile-danger",
} as const;

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SettingsMobileGroup({
  id,
  title,
  tone = "default",
  children,
}: {
  id: string;
  title: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const labelId = `${id}-label`;
  return (
    <section id={id} className="scroll-mt-24 px-4" aria-labelledby={labelId}>
      <h2
        id={labelId}
        className={`px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
          tone === "danger" ? "text-red-700 dark:text-red-300" : "text-muted"
        }`}
      >
        {title}
      </h2>
      <div
        className={
          tone === "danger"
            ? "divide-y divide-red-200/80 overflow-hidden rounded-2xl border border-red-200/80 bg-red-50/90 dark:divide-red-900/40 dark:border-red-900/50 dark:bg-red-950/35"
            : GROUP_SHELL
        }
      >
        {children}
      </div>
    </section>
  );
}

function SettingsMobileToggleRow({
  title,
  hint,
  checked,
  onChange,
  disabled,
  saving,
  savingLabel,
  ariaLabel,
  id,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  saving?: boolean;
  savingLabel?: string;
  ariaLabel: string;
  id?: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {hint ? <p className="mt-0.5 text-xs leading-5 text-muted">{hint}</p> : null}
        {saving && savingLabel ? <p className="mt-0.5 text-xs text-muted">{savingLabel}</p> : null}
      </div>
      <SettingsSwitch
        id={id}
        size="touch"
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function SettingsMobileDeepLink() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const view = searchParams.get("view");
    let id: string | null = null;
    if (hash === GROQ_AI_CONSENT_SETTINGS_HASH) {
      id = GROQ_AI_CONSENT_SETTINGS_HASH;
    } else if (hash === DUET_SHARE_SETTINGS_HASH) {
      id = DUET_SHARE_SETTINGS_HASH;
    } else if (view === "data") {
      id = SETTINGS_MOBILE_GROUP_IDS.data;
    } else if (view === "danger") {
      id = SETTINGS_MOBILE_GROUP_IDS.danger;
    } else if (view === "preferences") {
      id = SETTINGS_MOBILE_GROUP_IDS.ai;
    } else if (view === "profile") {
      id = SETTINGS_MOBILE_GROUP_IDS.account;
    }
    if (!id) return;
    const timeout = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  return null;
}

function SettingsMobileDuetRows() {
  const t = useTranslations("duet.settings");
  const { data, isLoading, error } = useDuetSettings();
  const { updateSettings } = useDuetMutations();
  const busy = isLoading || updateSettings.isPending;

  if (error) {
    return (
      <p className="px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300" role="alert">
        {t("error")}
      </p>
    );
  }

  return (
    <>
      <SettingsMobileToggleRow
        title={t("allowRequests")}
        checked={data?.allowFriendRequests ?? true}
        disabled={busy}
        ariaLabel={t("allowRequests")}
        onChange={(next) => updateSettings.mutate({ allowFriendRequests: next })}
      />
      <div className="flex min-h-11 items-center justify-between gap-3 px-3.5 py-2.5">
        <label htmlFor="settings-mobile-duet-scope" className="min-w-0 flex-1 text-sm font-medium text-foreground">
          {t("defaultScope")}
        </label>
        <select
          id="settings-mobile-duet-scope"
          disabled={busy}
          value={data?.defaultShareScope ?? "aggregates"}
          onChange={(e) => updateSettings.mutate({ defaultShareScope: e.target.value as DuetShareScope })}
          className="min-h-11 max-w-[11rem] rounded-xl border border-card-border bg-background px-2.5 text-sm text-foreground"
        >
          <option value="aggregates">{t("scopeAggregates")}</option>
          <option value="full">{t("scopeFull")}</option>
        </select>
      </div>
      <p className="px-3.5 py-2.5 text-xs leading-5 text-muted">{t("friendMusicHint")}</p>
    </>
  );
}

function SettingsMobileExportRows({
  exportError,
  exporting,
  onExport,
}: {
  exportError: string | null;
  exporting: boolean;
  onExport: () => void;
}) {
  const t = useTranslations("settings");
  const tExport = useTranslations("components.dateRangeFilter");
  const { exportCsv, exportStats, exportPdf } = useDashboardExports();

  const actions = [
    { key: "csv", label: tExport("exportMenuCsv"), title: tExport("exportCsvTitle"), onClick: exportCsv },
    { key: "json", label: tExport("exportMenuJson"), title: tExport("exportStatsTitle"), onClick: exportStats },
    { key: "pdf", label: tExport("exportMenuPdf"), title: tExport("exportPdfTitle"), onClick: exportPdf },
  ] as const;

  return (
    <>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          title={action.title}
          onClick={() => void action.onClick()}
          className={ROW_CLASS}
        >
          <span className="min-w-0 truncate">{action.label}</span>
          <span className="flex shrink-0 items-center gap-2 text-muted">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">{action.key}</span>
            <ChevronIcon className="h-4 w-4 text-muted" />
          </span>
        </button>
      ))}
      <button type="button" onClick={onExport} disabled={exporting} className={ROW_CLASS}>
        <span className="min-w-0 truncate">{exporting ? t("exporting") : t("exportAllDataTitle")}</span>
        <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
      </button>
      {exportError ? (
        <p className="px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {exportError}
        </p>
      ) : null}
    </>
  );
}

export function SettingsMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <div className="h-36 animate-pulse bg-gray-950" />
      <div className="space-y-4 px-4">
        <div className="h-36 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        <div className="h-28 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        <div className="h-24 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
      </div>
    </div>
  );
}

export function SettingsMobileSignedOut() {
  const t = useTranslations("settings");

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("mobile.eyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {t("mobile.signedOutTitle")}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-white/70">{t("mobile.signedOutBody")}</p>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-gray-950 no-underline shadow-2xl shadow-black/25"
          >
            {t("signInCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export type SettingsMobileExperienceProps = {
  withFilters: (href: string) => string;
  gdprContactEmail: string | null;
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
  exportError: string | null;
  exporting: boolean;
  onExport: () => void;
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
};

export function SettingsMobileExperience(props: SettingsMobileExperienceProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [dangerSheet, setDangerSheet] = useState<"clear" | "delete" | null>(null);
  const clearTitleId = useId();
  const deleteTitleId = useId();
  const displayName = props.nameInput.trim();
  const phraseDisabled = !props.expectedPhrase || !!props.phraseLoadError;

  return (
    <div className={MOBILE_BLEED}>
      <SettingsMobileDeepLink />
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative flex items-center gap-3">
          <UserAvatar
            src={props.avatarUrl}
            name={props.nameInput}
            email={props.accountEmail}
            size="lg"
            alt={t("profileImageAlt")}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
              {t("mobile.eyebrow")}
            </p>
            <h1 className="mt-1 truncate text-[1.45rem] font-semibold leading-[1.12] tracking-[-0.05em]">
              {displayName || t("mobile.unnamedAccount")}
            </h1>
            {props.accountEmail ? (
              <p className="mt-0.5 truncate text-sm text-white/60">{props.accountEmail}</p>
            ) : null}
          </div>
        </div>
      </section>

      <SettingsMobileGroup id={SETTINGS_MOBILE_GROUP_IDS.account} title={t("mobile.groupAccount")}>
        {props.profileLoadError ? (
          <p className="px-3.5 py-3 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {props.profileLoadError}
          </p>
        ) : (
          <form
            className="space-y-4 px-3.5 py-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSaveProfile();
            }}
            noValidate
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                src={props.avatarUrl}
                name={props.nameInput}
                email={props.accountEmail}
                size="md"
                alt={t("profileImageAlt")}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t("profileImageLabel")}</p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    props.onAvatarSelect(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-card-border bg-background px-3 text-sm font-semibold"
                    disabled={props.avatarUploading || props.avatarDeleting}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {props.avatarUploading
                      ? t("profileImageUploading")
                      : props.avatarUrl
                        ? t("profileImageReplace")
                        : t("profileImageUpload")}
                  </button>
                  {props.avatarUrl ? (
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:text-red-200"
                      disabled={props.avatarUploading || props.avatarDeleting}
                      onClick={props.onAvatarDelete}
                    >
                      {props.avatarDeleting ? t("profileImageDeleting") : t("profileImageRemove")}
                    </button>
                  ) : null}
                </div>
                {props.avatarError ? (
                  <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                    {props.avatarError}
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor="settings-mobile-display-name" className="text-sm font-medium text-foreground">
                {t("profileNameLabel")}
              </label>
              <input
                id="settings-mobile-display-name"
                type="text"
                name="displayName"
                autoComplete="name"
                maxLength={200}
                value={props.nameInput}
                onChange={(e) => props.onNameChange(e.target.value)}
                aria-invalid={!!props.nameFieldError}
                aria-describedby={props.nameFieldError ? "settings-mobile-name-error" : undefined}
                className={SETTINGS_INPUT_CLASS}
              />
              {props.nameFieldError ? (
                <p id="settings-mobile-name-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                  {props.nameFieldError}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">{t("profileEmailLabel")}</p>
              <p className="mt-1.5 text-sm text-muted">{props.accountEmail ?? "—"}</p>
            </div>

            <div className="flex min-h-6 items-center justify-between gap-3">
              <div className="min-h-6 text-sm">
                {props.profileSaved ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400" role="status">
                    {t("profileSaved")}
                  </span>
                ) : null}
                {props.profileSaveError ? (
                  <span className="font-medium text-red-600 dark:text-red-400" role="alert">
                    {props.profileSaveError}
                  </span>
                ) : null}
              </div>
              <button type="submit" disabled={props.profileSaveDisabled} className={SETTINGS_PRIMARY_SAVE_CLASS}>
                {props.profileSaving ? t("savingProfile") : t("saveProfile")}
              </button>
            </div>
          </form>
        )}
      </SettingsMobileGroup>

      <SettingsMobileGroup id={SETTINGS_MOBILE_GROUP_IDS.data} title={t("mobile.groupDataPrivacy")}>
        <Link href={props.withFilters(DASHBOARD_ONBOARDING_REIMPORT_PATH)} className={`${ROW_CLASS} no-underline`}>
          <span className="min-w-0 truncate">{t("importExportsTitle")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
        </Link>
        <SettingsMobileExportRows
          exportError={props.exportError}
          exporting={props.exporting}
          onExport={props.onExport}
        />
        {props.gdprContactEmail ? (
          <a href={`mailto:${props.gdprContactEmail}`} className={`${ROW_CLASS} no-underline`}>
            <span className="min-w-0 truncate">{props.gdprContactEmail}</span>
            <ChevronIcon className="h-4 w-4 shrink-0 text-muted" />
          </a>
        ) : null}
        <div id={DUET_SHARE_SETTINGS_HASH} className="scroll-mt-24">
          <SettingsMobileDuetRows />
        </div>
      </SettingsMobileGroup>

      <SettingsMobileGroup id={SETTINGS_MOBILE_GROUP_IDS.ai} title={t("mobile.groupAi")}>
        <div id={GROQ_AI_CONSENT_SETTINGS_HASH} className="scroll-mt-24">
          <SettingsMobileToggleRow
            title={t("groqConsentTitle")}
            hint={t("groqConsentHint")}
            checked={props.groqConsentGranted}
            disabled={!props.privacyPrefsLoaded || props.privacySaving}
            saving={props.privacySaving}
            savingLabel={t("groqConsentSaving")}
            ariaLabel={t("groqConsentLabel")}
            onChange={props.onGroqConsentChange}
          />
        </div>
        <SettingsMobileToggleRow
          title={t("genreBannerTitle")}
          hint={t("genreBannerHint")}
          checked={props.hideGenreBanner}
          ariaLabel={t("switchHideGenreAria")}
          onChange={props.onHideGenreBannerChange}
        />
        {props.privacyError ? (
          <p className="px-3.5 py-2 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
            {props.privacyError}
          </p>
        ) : null}
      </SettingsMobileGroup>

      {props.publicProfileEligible ? (
        <SettingsMobileGroup id={SETTINGS_MOBILE_GROUP_IDS.demo} title={t("mobile.groupDemo")}>
          <SettingsMobileToggleRow
            title={t("publicProfileTitle")}
            hint={t("publicProfileHint")}
            checked={props.publicProfileGranted}
            disabled={!props.privacyPrefsLoaded || props.privacySaving}
            saving={props.privacySaving}
            savingLabel={t("publicProfileSaving")}
            ariaLabel={t("publicProfileLabel")}
            onChange={props.onPublicProfileChange}
          />
        </SettingsMobileGroup>
      ) : null}

      <SettingsMobileGroup id={SETTINGS_MOBILE_GROUP_IDS.danger} title={t("mobile.groupDanger")} tone="danger">
        <button type="button" className={`${ROW_CLASS} text-red-800 dark:text-red-200`} onClick={() => setDangerSheet("clear")}>
          <span className="min-w-0 truncate">{t("dangerTitle")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0" />
        </button>
        <button
          type="button"
          className={`${ROW_CLASS} text-red-800 dark:text-red-200`}
          onClick={() => setDangerSheet("delete")}
        >
          <span className="min-w-0 truncate">{t("deleteAccountTitle")}</span>
          <ChevronIcon className="h-4 w-4 shrink-0" />
        </button>
      </SettingsMobileGroup>

      <MobileBottomSheet
        open={dangerSheet === "clear"}
        onClose={() => setDangerSheet(null)}
        ariaLabelledBy={clearTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={clearTitleId} className="text-lg font-semibold tracking-tight text-foreground">
              {t("dangerTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setDangerSheet(null)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tCommon("close")}
            >
              {tCommon("close")}
            </button>
          </div>
          <p className="text-sm leading-6 text-muted">{t("dangerBody")}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground">
            {(["dangerBulletListens", "dangerBulletReplay", "dangerBulletOnboarding"] as const).map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <div className="mt-4 space-y-4">
            <DangerPhraseFields
              expectedPhrase={props.expectedPhrase}
              phraseLoadError={props.phraseLoadError}
              phraseInput={props.phraseInput}
              onPhraseInputChange={props.onPhraseInputChange}
              inputId="settings-mobile-deletion-confirmation-phrase"
            />
            <label
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-card-border px-3 py-3 ${
                phraseDisabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-violet-600"
                checked={props.understood}
                onChange={(e) => props.onUnderstoodChange(e.target.checked)}
                disabled={phraseDisabled}
                aria-label={t("switchUnderstandAria")}
              />
              <span className="text-sm text-foreground">{t("confirmCheckbox")}</span>
            </label>
            {props.clearError ? (
              <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                {props.clearError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={props.onRunClear}
              disabled={!props.understood || !props.phraseOk || props.clearing || phraseDisabled}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            >
              {props.clearing ? t("clearing") : t("clearDataButton")}
            </button>
          </div>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={dangerSheet === "delete"}
        onClose={() => setDangerSheet(null)}
        ariaLabelledBy={deleteTitleId}
        insetAboveBottomNav
      >
        <div className="px-4 pb-3 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={deleteTitleId} className="text-lg font-semibold tracking-tight text-foreground">
              {t("deleteAccountTitle")}
            </h2>
            <button
              type="button"
              onClick={() => setDangerSheet(null)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tCommon("close")}
            >
              {tCommon("close")}
            </button>
          </div>
          <p className="text-sm leading-6 text-muted">{t("deleteAccountBody")}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground">
            {(["deleteAccountBulletProfile", "deleteAccountBulletSpotify", "deleteAccountBulletAllData"] as const).map(
              (key) => (
                <li key={key}>{t(key)}</li>
              )
            )}
          </ul>
          <div className="mt-4 space-y-4">
            <DangerPhraseFields
              expectedPhrase={props.expectedPhrase}
              phraseLoadError={props.phraseLoadError}
              phraseInput={props.deleteAccountPhraseInput}
              onPhraseInputChange={props.onDeleteAccountPhraseChange}
              inputId="settings-mobile-delete-account-confirmation-phrase"
            />
            <label
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-card-border px-3 py-3 ${
                phraseDisabled ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-violet-600"
                checked={props.deleteAccountUnderstood}
                onChange={(e) => props.onDeleteAccountUnderstoodChange(e.target.checked)}
                disabled={phraseDisabled}
              />
              <span className="text-sm text-foreground">{t("deleteAccountCheckbox")}</span>
            </label>
            {props.deleteAccountError ? (
              <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
                {props.deleteAccountError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={props.onDeleteAccount}
              disabled={
                !props.deleteAccountUnderstood ||
                !props.deleteAccountPhraseOk ||
                props.deletingAccount ||
                phraseDisabled
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-400 bg-red-700 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.deletingAccount ? t("deletingAccount") : t("deleteAccountButton")}
            </button>
          </div>
        </div>
      </MobileBottomSheet>
    </div>
  );
}
