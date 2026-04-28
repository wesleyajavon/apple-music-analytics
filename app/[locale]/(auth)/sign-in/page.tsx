"use client";

import { FormEvent, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "@/lib/constants/public-profile";

export default function SignInPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reason = searchParams.get("reason");
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      window.location.href = nextPath;
    } finally {
      setIsLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          queryParams: reason === "recent-auth" ? { prompt: "login" } : undefined,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const inputClassName =
    "w-full rounded-lg border border-card-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none transition-shadow ring-ring focus:border-primary focus:ring-2 focus:ring-ring";

  return (
    <main
      id="auth-main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12"
    >
      <section
        className="w-full rounded-2xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm sm:p-8"
        aria-labelledby="sign-in-heading"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("signInEyebrow")}
        </p>
        <h1
          id="sign-in-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("signInTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("signInSubtitle")}
        </p>

        {reason === "recent-auth" ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
          >
            {t("recentAuthNotice")}
          </p>
        ) : null}

        <form method="post" onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor={emailId}
              className="mb-1.5 block text-sm font-medium text-foreground/85"
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
              className={inputClassName}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          <div>
            <label
              htmlFor={passwordId}
              className="mb-1.5 block text-sm font-medium text-foreground/85"
            >
              {t("password")}
            </label>
            <input
              id={passwordId}
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </div>

          {error && (
            <p
              id={errorId}
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t("signingIn") : t("signIn")}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t border-card-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-3 text-muted">
                {t("orDivider")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-card-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card-surface disabled:cursor-not-allowed disabled:opacity-60"
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
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {t("noAccount")}{" "}
          <Link href="/sign-up" className="font-semibold text-primary hover:underline">
            {t("signUp")}
          </Link>
        </p>

        <p className="mt-4 text-center sm:hidden">
          <Link
            href={`/dashboard/overview?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`}
            className="text-sm font-medium text-muted underline-offset-4 hover:text-primary hover:underline"
          >
            {t("dashboardLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
