"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ForgotPasswordResponse } from "@/lib/auth/forgot-password-types";

type OAuthProvider = "google" | "spotify";

function formatProviderList(
  providers: OAuthProvider[],
  t: ReturnType<typeof useTranslations<"auth">>
): string {
  const labels = providers.map((p) =>
    p === "google" ? t("oauthProviderGoogle") : t("oauthProviderSpotify")
  );
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }
  return `${labels.slice(0, -1).join(", ")}${t("oauthProviderJoiner")}${labels[labels.length - 1]}`;
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const emailId = useId();
  const errorId = useId();
  const successId = useId();
  const oauthId = useId();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[] | null>(null);

  const oauthProviderLabel = useMemo(
    () => (oauthProviders ? formatProviderList(oauthProviders, t) : ""),
    [oauthProviders, t]
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setEmailSent(false);
    setOauthProviders(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });

      const payload = (await response.json()) as ForgotPasswordResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? t("forgotPasswordError"));
        return;
      }

      if (payload.outcome === "oauth_only" && payload.providers?.length) {
        setOauthProviders(payload.providers);
        return;
      }

      setEmailSent(true);
    } catch {
      setError(t("forgotPasswordError"));
    } finally {
      setIsLoading(false);
    }
  }

  const inputClassName =
    "w-full rounded-lg border border-card-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none transition-shadow ring-ring focus:border-primary focus:ring-2 focus:ring-ring";

  const statusId = error ? errorId : emailSent ? successId : oauthProviders ? oauthId : undefined;

  return (
    <main
      id="auth-main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:py-12"
    >
      <section
        className="w-full rounded-2xl border border-card-border bg-card-surface p-6 shadow-card backdrop-blur-sm sm:p-8"
        aria-labelledby="forgot-password-heading"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t("forgotPasswordEyebrow")}
        </p>
        <h1
          id="forgot-password-heading"
          className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          {t("forgotPasswordTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("forgotPasswordSubtitle")}
        </p>

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
              aria-describedby={statusId}
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

          {oauthProviders && (
            <div
              id={oauthId}
              role="status"
              className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <p>{t("forgotPasswordOAuthOnly", { providers: oauthProviderLabel })}</p>
              <p>
                <Link
                  href="/sign-in"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t("forgotPasswordBackToSignIn")}
                </Link>
              </p>
            </div>
          )}

          {emailSent && (
            <p
              id={successId}
              role="status"
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {t("forgotPasswordEmailSent")}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand-glow transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t("forgotPasswordSending") : t("forgotPasswordSubmit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            {t("forgotPasswordBackToSignIn")}
          </Link>
        </p>
      </section>
    </main>
  );
}
