"use client";

import { FormEvent, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { setOAuthTermsCookie } from "@/lib/auth/oauth-terms-cookie";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePublicDemo } from "@/lib/providers/public-demo-provider";
import { SPOTIFY_WEB_API_OAUTH_SCOPES } from "@/lib/services/spotify/spotify-web-api-scopes";
import {
  AUTH_DIVIDER_LINE_CLASS,
  AUTH_DIVIDER_TEXT_CLASS,
  AUTH_FOOTER_LINK_CLASS,
  AUTH_FORM_PANEL_CLASS,
  AUTH_HEADING_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_OAUTH_BUTTON_CLASS,
  AUTH_PLAIN_FORM_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@/lib/constants/auth-form-styles";

export default function SignUpPage() {
  const t = useTranslations("auth");
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const successId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { publicDemoOverviewPath: publicDemoPath } = usePublicDemo();

  function assertTermsForOAuth(): boolean {
    if (!termsAccepted) {
      setError(t("termsConsentRequired"));
      return false;
    }
    setOAuthTermsCookie();
    return true;
  }

  async function onGoogleSignUp() {
    if (!assertTermsForOAuth()) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSpotifySignUp() {
    if (!assertTermsForOAuth()) return;
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "spotify",
        options: {
          redirectTo,
          scopes: SPOTIFY_WEB_API_OAUTH_SCOPES,
          queryParams: { show_dialog: "true" },
        },
      });
      if (oauthError) setError(oauthError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!termsAccepted) {
      setError(t("termsConsentRequired"));
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(t("signUpSuccess"));
    } finally {
      setIsLoading(false);
    }
  }

  const statusId = error ? errorId : success ? successId : undefined;

  return (
    <main id="auth-main" tabIndex={-1} className={AUTH_FORM_PANEL_CLASS}>
      <section className={AUTH_PLAIN_FORM_CLASS} aria-labelledby="sign-up-heading">
        <h1
          id="sign-up-heading"
          className={AUTH_HEADING_CLASS}
        >
          {t("signUpTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("signUpSubtitle")}
        </p>

        <form method="post" onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor={emailId}
              className={AUTH_LABEL_CLASS}
            >
              {t("email")}
            </label>
            <input
              id={emailId}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT_CLASS}
              aria-invalid={error ? true : undefined}
              aria-describedby={statusId}
            />
          </div>

          <div>
            <label
              htmlFor={passwordId}
              className={AUTH_LABEL_CLASS}
            >
              {t("password")}
            </label>
            <input
              id={passwordId}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={AUTH_INPUT_CLASS}
              aria-invalid={error ? true : undefined}
              aria-describedby={statusId}
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-muted lg:text-white/55">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30 lg:border-white/25 lg:bg-white/5"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (error === t("termsConsentRequired")) setError(null);
              }}
              required
            />
            <span>
              {t.rich("termsConsentLabel", {
                terms: (chunks) => (
                  <Link href="/legal/terms" className="font-medium text-primary underline-offset-2 hover:underline lg:text-white/85 lg:hover:text-white">
                    {t("termsLink")}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/legal/privacy" className="font-medium text-primary underline-offset-2 hover:underline lg:text-white/85 lg:hover:text-white">
                    {t("privacyLink")}
                  </Link>
                ),
              })}
            </span>
          </label>

          {error && (
            <p
              id={errorId}
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              id={successId}
              role="status"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={AUTH_PRIMARY_BUTTON_CLASS}
          >
            {isLoading ? t("creatingAccount") : t("signUp")}
          </button>
        </form>

        <div className="relative mt-6 py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className={AUTH_DIVIDER_LINE_CLASS} />
          </div>
          <div className="relative flex justify-center">
            <span className={AUTH_DIVIDER_TEXT_CLASS}>{t("orDivider")}</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => void onGoogleSignUp()}
            disabled={isLoading}
            className={AUTH_OAUTH_BUTTON_CLASS}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t("continueWithGoogle")}
          </button>

          <button
            type="button"
            onClick={() => void onSpotifySignUp()}
            disabled={isLoading}
            className={`${AUTH_OAUTH_BUTTON_CLASS} border-[#1ed760]/35 bg-[#191414] text-white hover:bg-[#282828] hover:text-white lg:border-[#1ed760]/40 lg:bg-[#121212]/90 lg:hover:bg-[#1a1a1a]`}
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#1DB954"
                d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.261 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
              />
            </svg>
            {t("continueWithSpotify")}
          </button>
        </div>

        <p className="mt-8 text-sm text-muted">
          {t("alreadyAccount")}{" "}
          <Link href="/sign-in" className={AUTH_FOOTER_LINK_CLASS}>
            {t("signIn")}
          </Link>
        </p>

        {publicDemoPath ? (
          <p className="mt-4 text-center sm:hidden">
            <Link
              href={publicDemoPath}
              className="text-sm font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
            >
              {t("dashboardLink")}
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
