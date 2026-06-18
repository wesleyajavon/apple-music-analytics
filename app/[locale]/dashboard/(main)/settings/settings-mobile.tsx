"use client";

import { useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Download, LayoutDashboard, Upload } from "lucide-react";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { Link } from "@/i18n/navigation";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { DashboardDataExportsSection } from "@/lib/components/dashboard-data-exports-section";
import { UserAvatar } from "@/lib/components/user-avatar";
import { DASHBOARD_SPOTLIGHT_BTN_SECONDARY, DASHBOARD_SPOTLIGHT_INNER_WELL, DASHBOARD_SPOTLIGHT_MUTED } from "@/lib/constants/dashboard-spotlight";
import { GROQ_AI_CONSENT_SETTINGS_HASH } from "@/lib/constants/groq-ai-settings";
import { SettingsToggleRow, SettingsMobileSectionLabel, SettingsMobileSectionNav } from "./settings-shared";

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/15 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-slate-500";

const PRIMARY_SAVE_CLASS =
  "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:shadow-black/25 dark:hover:bg-slate-100";

export type SettingsMobileProps = {
  nameInput: string;
  onNameChange: (value: string) => void;
  nameFieldError: string | null;
  accountEmail: string | null;
  avatarUrl: string | null;
  avatarUploading: boolean;
  avatarDeleting: boolean;
  avatarError: string | null;
  onAvatarSelect: (file: File | null | undefined) => void;
  onAvatarDelete: () => void;
  profileLoadError: string | null;
  profileSaveError: string | null;
  profileSaved: boolean;
  profileSaving: boolean;
  profileSaveDisabled: boolean;
  onSaveProfile: () => void;
  hideGenreBanner: boolean;
  onHideGenreBannerChange: (next: boolean) => void;
  groqConsentGranted: boolean;
  publicProfileEligible: boolean;
  publicProfileGranted: boolean;
  privacyPrefsLoaded: boolean;
  privacySaving: boolean;
  privacyError: string | null;
  onGroqConsentChange: (next: boolean) => void;
  onPublicProfileChange: (next: boolean) => void;
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
};

function MobileDisclosure({
  title,
  summary,
  children,
  variant = "default",
}: {
  title: string;
  summary: string;
  children: ReactNode;
  variant?: "default" | "danger";
}) {
  const shellClass =
    variant === "danger"
      ? "rounded-[1.5rem] border border-red-200/90 bg-gradient-to-b from-red-50/95 to-red-50/50 shadow-lg shadow-red-900/10 dark:border-red-900/50 dark:from-red-950/40 dark:to-red-950/15"
      : "rounded-[1.5rem] border border-slate-200/80 bg-white shadow-lg shadow-slate-900/[0.04] dark:border-white/10 dark:bg-slate-950";

  return (
    <details className={`group ${shellClass}`}>
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${
              variant === "danger" ? "text-red-950 dark:text-red-200" : "text-slate-950 dark:text-white"
            }`}
          >
            {title}
          </p>
          <p
            className={`text-xs ${
              variant === "danger" ? "text-red-800/80 dark:text-red-300/80" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {summary}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 transition-transform group-open:rotate-180 ${
            variant === "danger" ? "text-red-600 dark:text-red-300" : "text-slate-500"
          }`}
          aria-hidden
        />
      </summary>
      <div
        className={`border-t px-4 py-4 ${
          variant === "danger"
            ? "border-red-200/70 dark:border-red-900/40"
            : "border-slate-200/80 dark:border-white/10"
        }`}
      >
        {children}
      </div>
    </details>
  );
}

export function SettingsMobileSkeleton() {
  return (
    <section className="space-y-4 pb-6 lg:hidden" aria-busy="true">
      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="mb-5 h-6 w-28 animate-pulse rounded-full bg-white/15" />
        <div className="mx-auto mb-4 h-20 w-20 animate-pulse rounded-full bg-white/15" />
        <div className="mb-3 h-8 w-4/5 animate-pulse rounded-xl bg-white/15" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="mt-6 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="mb-3 h-6 w-16 animate-pulse rounded bg-white/15" />
              <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-950">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
      </div>
    </section>
  );
}

export function SettingsMobileSignedOut() {
  const t = useTranslations("settings");

  return (
    <section className="space-y-4 pb-6 lg:hidden" aria-labelledby="settings-mobile-signed-out-title">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(251,191,36,0.18),transparent_32%)]" />
        <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-amber-100">
            {t("signedOutHeroEyebrow")}
          </span>
          <h1
            id="settings-mobile-signed-out-title"
            className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-balance"
          >
            {t("mobile.signedOutStoryTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/70">{t("mobile.signedOutStoryBody")}</p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {t("signInCta")}
          </Link>
        </div>
      </div>

      <MobileDisclosure title={t("mobile.trustDisclosureTitle")} summary={t("mobile.trustDisclosureSummary")}>
        <ul className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {(["signedOutTrust1", "signedOutTrust2", "signedOutTrust3"] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </MobileDisclosure>
    </section>
  );
}

export function SettingsMobileExperience(props: SettingsMobileProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const displayName = props.nameInput.trim() || t("mobile.unnamedAccount");
  const storyTitle = props.nameInput.trim()
    ? t("mobile.storyTitleNamed", { name: displayName })
    : t("mobile.storyTitle");

  const sectionNavItems = [
    { href: "#settings-mobile-profile", label: t("sectionProfile") },
    { href: "#settings-mobile-preferences", label: t("sectionPreferences") },
    { href: "#settings-mobile-your-data", label: t("sectionYourData") },
    { href: "#settings-mobile-danger", label: t("sectionDanger") },
  ];

  return (
    <section className="space-y-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden" aria-labelledby="settings-mobile-title">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.2),transparent_32%)]" />
        <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-100">
              <LiveStatusDot />
              {t("mobile.eyebrow")}
            </span>
            {props.profileSaved ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                {t("profileSaved")}
              </span>
            ) : null}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <UserAvatar
              src={props.avatarUrl}
              name={props.nameInput}
              email={props.accountEmail}
              size="xl"
              alt={t("profileImageAlt")}
            />
            <div className="min-w-0 flex-1">
              <h1 id="settings-mobile-title" className="text-2xl font-semibold tracking-[-0.05em] text-balance">
                {storyTitle}
              </h1>
              {props.accountEmail ? (
                <p className="mt-1 truncate text-sm text-white/60" title={props.accountEmail}>
                  {props.accountEmail}
                </p>
              ) : null}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/70">{t("mobile.storyBody")}</p>
        </div>
      </div>

      <SettingsMobileSectionNav ariaLabel={t("navOnThisPage")} items={sectionNavItems} />

      <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/dashboard/overview"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm no-underline dark:border-white/10 dark:bg-slate-950 dark:text-white"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden />
          {t("ctaOverview")}
        </Link>
        <Link
          href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50 px-4 text-sm font-semibold text-violet-900 no-underline dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-100"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {t("importExportsCta")}
        </Link>
        {!props.profileSaveDisabled ? (
          <button
            type="button"
            onClick={() => props.onSaveProfile()}
            disabled={props.profileSaving}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
          >
            {props.profileSaving ? t("savingProfile") : t("saveProfile")}
          </button>
        ) : null}
      </div>

      <div id="settings-mobile-profile" className="scroll-mt-28 space-y-3">
        <SettingsMobileSectionLabel>{t("sectionProfile")}</SettingsMobileSectionLabel>
      <MobileDisclosure title={t("mobile.profileDisclosureTitle")} summary={t("mobile.profileDisclosureSummary")}>
        {props.profileLoadError ? (
          <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
            {props.profileLoadError}
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSaveProfile();
            }}
            noValidate
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
              <UserAvatar
                src={props.avatarUrl}
                name={props.nameInput}
                email={props.accountEmail}
                size="xl"
                alt={t("profileImageAlt")}
              />
              <p className="text-center text-sm font-medium text-slate-900 dark:text-white">{t("profileImageLabel")}</p>
              <p className={`text-center text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("profileImageHint")}</p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  props.onAvatarSelect(e.target.files?.[0]);
                }}
              />
              <div className="flex w-full flex-col gap-2">
                <button
                  type="button"
                  className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} min-h-11 w-full`}
                  disabled={props.avatarUploading || props.avatarDeleting}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  {props.avatarUploading
                    ? t("profileImageUploading")
                    : props.avatarUrl
                      ? t("profileImageReplace")
                      : t("profileImageUpload")}
                </button>
                {props.avatarUrl ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-200/80 bg-red-50 px-5 text-sm font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                    disabled={props.avatarUploading || props.avatarDeleting}
                    onClick={() => props.onAvatarDelete()}
                  >
                    {props.avatarDeleting ? t("profileImageDeleting") : t("profileImageRemove")}
                  </button>
                ) : null}
              </div>
              {props.avatarError ? (
                <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                  {props.avatarError}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="settings-mobile-display-name" className="text-sm font-medium text-slate-900 dark:text-white">
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
                className={INPUT_CLASS}
              />
              {props.nameFieldError ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                  {props.nameFieldError}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{t("profileEmailLabel")}</p>
              <p className="mt-2 rounded-xl border border-dashed border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-600 dark:border-white/15 dark:bg-black/20 dark:text-slate-400">
                {props.accountEmail ?? "—"}
              </p>
              <p className={`mt-1.5 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("profileEmailHint")}</p>
            </div>

            <div className="space-y-2">
              {props.profileSaveError ? (
                <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                  {props.profileSaveError}
                </p>
              ) : null}
              <button type="submit" disabled={props.profileSaveDisabled} className={PRIMARY_SAVE_CLASS}>
                {props.profileSaving ? t("savingProfile") : t("saveProfile")}
              </button>
            </div>
          </form>
        )}
      </MobileDisclosure>
      </div>

      <div id="settings-mobile-preferences" className="scroll-mt-28 space-y-3">
        <SettingsMobileSectionLabel>{t("sectionPreferences")}</SettingsMobileSectionLabel>
      <MobileDisclosure title={t("mobile.preferencesDisclosureTitle")} summary={t("mobile.preferencesDisclosureSummary")}>
        <div className="space-y-3">
          <SettingsToggleRow
            title={t("genreBannerHideLabel")}
            hint={t("genreBannerHint")}
            checked={props.hideGenreBanner}
            ariaLabel={t("switchHideGenreAria")}
            onChange={props.onHideGenreBannerChange}
          />

          <div id={GROQ_AI_CONSENT_SETTINGS_HASH} className="scroll-mt-28">
            <SettingsToggleRow
              title={t("groqConsentLabel")}
              hint={t("groqConsentHint")}
              checked={props.groqConsentGranted}
              disabled={!props.privacyPrefsLoaded || props.privacySaving}
              saving={props.privacySaving}
              savingLabel={t("groqConsentSaving")}
              ariaLabel={t("groqConsentLabel")}
              onChange={props.onGroqConsentChange}
            />
          </div>

          {props.publicProfileEligible ? (
            <SettingsToggleRow
              title={t("publicProfileLabel")}
              hint={t("publicProfileHint")}
              checked={props.publicProfileGranted}
              disabled={!props.privacyPrefsLoaded || props.privacySaving}
              saving={props.privacySaving}
              savingLabel={t("publicProfileSaving")}
              ariaLabel={t("publicProfileLabel")}
              onChange={props.onPublicProfileChange}
            />
          ) : null}

          {props.privacyError ? (
            <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
              {props.privacyError}
            </p>
          ) : null}
        </div>
      </MobileDisclosure>
      </div>

      <div id="settings-mobile-your-data" className="scroll-mt-28 space-y-3">
        <SettingsMobileSectionLabel>{t("sectionYourData")}</SettingsMobileSectionLabel>
      <MobileDisclosure title={t("mobile.yourDataDisclosureTitle")} summary={t("mobile.yourDataDisclosureSummary")}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950">
                <Upload className="h-4 w-4 text-slate-700 dark:text-slate-200" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("importExportsTitle")}</p>
                <p className={`mt-1 text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("importExportsBodyShort")}</p>
              </div>
            </div>
            <Link
              href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
              className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} mt-4 inline-flex min-h-11 w-full items-center justify-center no-underline`}
            >
              {t("importExportsCta")}
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-950">
                <Download className="h-4 w-4 text-slate-700 dark:text-slate-200" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboardExportsTitle")}</p>
                <p className={`mt-1 text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("dashboardExportsBodyShort")}</p>
              </div>
            </div>
            <div className="mt-4">
              <DashboardDataExportsSection variant="embedded" />
            </div>
          </div>
        </div>
      </MobileDisclosure>
      </div>

      <div id="settings-mobile-danger" className="scroll-mt-28 space-y-3">
        <SettingsMobileSectionLabel>{t("sectionDanger")}</SettingsMobileSectionLabel>
      <MobileDisclosure
        title={t("mobile.dangerDisclosureTitle")}
        summary={t("mobile.dangerDisclosureSummary")}
        variant="danger"
      >
        <p className="text-sm leading-relaxed text-red-900/90 dark:text-red-200/90">{t("dangerBody")}</p>
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

        <div className="mt-5 space-y-4">
          {props.phraseLoadError ? (
            <p className="text-sm font-medium text-red-800 dark:text-red-300" role="alert">
              {props.phraseLoadError}
            </p>
          ) : props.expectedPhrase ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-800 dark:text-slate-200">{t("phraseInstruction")}</p>
              <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} font-mono text-base font-semibold tracking-wide text-slate-900 dark:text-white`}>
                {props.expectedPhrase}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-900 dark:text-white" htmlFor="settings-mobile-deletion-phrase">
                  {t("phraseLabel")}
                </label>
                <input
                  id="settings-mobile-deletion-phrase"
                  type="text"
                  name="deletion-confirmation-phrase"
                  autoComplete="off"
                  spellCheck={false}
                  value={props.phraseInput}
                  onChange={(e) => props.onPhraseInputChange(e.target.value)}
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
            className={`flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
              props.understood
                ? "border-violet-300/50 bg-violet-50/80 dark:border-violet-400/30 dark:bg-violet-950/25"
                : "border-slate-200/90 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.04]"
            } ${!props.expectedPhrase || !!props.phraseLoadError ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/40 dark:border-white/20"
              checked={props.understood}
              onChange={(e) => props.onUnderstoodChange(e.target.checked)}
              disabled={!props.expectedPhrase || !!props.phraseLoadError}
              aria-label={t("switchUnderstandAria")}
            />
            <span className="text-sm text-slate-900 dark:text-white">{t("confirmCheckbox")}</span>
          </label>

          {props.clearError ? (
            <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
              {props.clearError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => props.onRunClear()}
            disabled={
              !props.understood || !props.phraseOk || props.clearing || !!props.phraseLoadError || !props.expectedPhrase
            }
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80"
          >
            {props.clearing ? t("clearing") : t("clearDataButton")}
          </button>
        </div>
      </MobileDisclosure>
      </div>
    </section>
  );
}
