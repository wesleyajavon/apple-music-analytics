"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { UserAvatar } from "@/lib/components/user-avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

export function DashboardUserMenu() {
  const searchParams = useSearchParams();
  const t = useTranslations("components.dashboardUserMenu");
  const tSidebar = useTranslations("sidebar");

  const [open, setOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const settingsHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/settings", searchParams),
    [searchParams]
  );

  const accountDisplayName = profileName?.trim() || authEmail || null;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    let mounted = true;
    const supabase = createSupabaseBrowserClient();

    async function loadProfile() {
      try {
        const res = await fetch("/api/user/me", { credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as {
          user?: {
            name: string | null;
            email: string | null;
            avatarUrl: string | null;
          } | null;
        };
        if (!mounted || !res.ok) return;
        setProfileName(data.user?.name ?? null);
        setAuthEmail(data.user?.email ?? null);
        setProfileAvatarUrl(data.user?.avatarUrl ?? null);
      } catch {
        // Keep auth metadata fallback if the profile endpoint is temporarily unavailable.
      }
    }

    async function loadAuthUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthEmail(data.user?.email ?? null);
      setAuthUserId(data.user?.id ?? null);
      if (data.user) void loadProfile();
      else {
        setProfileName(null);
        setProfileAvatarUrl(null);
      }
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthEmail(session?.user?.email ?? null);
      setAuthUserId(session?.user?.id ?? null);
      if (session?.user) void loadProfile();
      else {
        setProfileName(null);
        setProfileAvatarUrl(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      setIsSigningOut(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/sign-in";
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("menuLabel")}
        title={accountDisplayName ?? tSidebar("items.settings")}
        className="flex h-9 w-9 items-center justify-center rounded-xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background max-lg:h-11 max-lg:w-11"
      >
        <UserAvatar
          src={profileAvatarUrl}
          name={profileName}
          email={authEmail}
          size="sm"
          alt={accountDisplayName ?? ""}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-50 w-[min(15rem,calc(100vw-5rem))] overflow-hidden rounded-xl border border-card-border bg-surface-raised py-1 shadow-card"
        >
          {accountDisplayName ? (
            <div className="border-b border-card-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-foreground">{accountDisplayName}</p>
              {authEmail ? (
                <p className="truncate text-xs text-muted" title={authEmail}>
                  {authEmail}
                </p>
              ) : null}
            </div>
          ) : null}
          <Link
            href={settingsHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="min-w-0 truncate">{tSidebar("items.settings")}</span>
          </Link>
          {authUserId ? (
            <button
              type="button"
              role="menuitem"
              disabled={isSigningOut}
              onClick={() => {
                setOpen(false);
                void handleSignOut();
              }}
              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="min-w-0 truncate">
                {isSigningOut ? tSidebar("signingOut") : tSidebar("signOut")}
              </span>
            </button>
          ) : (
            <Link
              href="/sign-in"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <svg className="h-4 w-4 shrink-0 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              <span className="min-w-0 truncate">{t("signIn")}</span>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
