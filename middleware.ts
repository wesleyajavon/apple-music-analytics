import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { getConfiguredPublicProfileUserId } from "@/lib/constants/public-profile";

const handleI18nRouting = createMiddleware(routing);

function getPathWithoutLocalePrefix(pathname: string): string {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (maybeLocale && routing.locales.includes(maybeLocale as "fr" | "en" | "es")) {
    return `/${segments.slice(2).join("/")}`;
  }
  return pathname;
}

function getLocaleFromPathname(pathname: string): string | null {
  const maybeLocale = pathname.split("/")[1];
  if (maybeLocale && routing.locales.includes(maybeLocale as "fr" | "en" | "es")) {
    return maybeLocale;
  }
  return null;
}

function getLocalizedPath(path: string, locale: string | null): string {
  return locale ? `/${locale}${path}` : path;
}

function redirectToPublicPaletteFallback(
  request: NextRequest,
  locale: string | null,
  publicProfileId: string
) {
  const fallbackUrl = new URL(
    getLocalizedPath("/dashboard/genres", locale),
    request.url
  );
  fallbackUrl.searchParams.set("userId", publicProfileId);
  fallbackUrl.searchParams.set("palette", "restricted");
  return NextResponse.redirect(fallbackUrl);
}

function redirectToPublicHome(request: NextRequest, locale: string | null) {
  return NextResponse.redirect(
    new URL(getLocalizedPath("/", locale), request.url)
  );
}

function redirectToSignIn(
  request: NextRequest,
  locale: string | null,
  nextPath: string
) {
  const signInUrl = new URL(getLocalizedPath("/sign-in", locale), request.url);
  signInUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(signInUrl);
}

function withUrlHeader(request: NextRequest): NextRequest {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.nextUrl.href);
  return new NextRequest(request, { headers: requestHeaders });
}

export default async function middleware(request: NextRequest) {
  const requestWithUrl = withUrlHeader(request);
  const response = handleI18nRouting(requestWithUrl);
  const { response: sessionResponse, user } = await updateSession(requestWithUrl, response);

  const normalizedPath = getPathWithoutLocalePrefix(request.nextUrl.pathname);
  const isDashboardRoute =
    normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard/");

  if (isDashboardRoute && !user) {
    const configuredPublicId = getConfiguredPublicProfileUserId();
    const userIdParam = request.nextUrl.searchParams.get("userId");
    const locale = getLocaleFromPathname(request.nextUrl.pathname);

    let activePublicId: string | null = null;
    if (configuredPublicId && userIdParam === configuredPublicId) {
      try {
        const statusUrl = new URL("/api/public-demo/status", request.url);
        const statusRes = await fetch(statusUrl, { cache: "no-store" });
        if (statusRes.ok) {
          const payload = (await statusRes.json()) as { active?: boolean; userId?: string | null };
          if (payload.active && payload.userId === configuredPublicId) {
            activePublicId = configuredPublicId;
          }
        }
      } catch {
        activePublicId = null;
      }
    }

    if (normalizedPath === "/dashboard/genres/palette") {
      if (activePublicId) {
        return redirectToPublicPaletteFallback(request, locale, activePublicId);
      }
      return redirectToPublicHome(request, locale);
    }

    if (normalizedPath.startsWith("/dashboard/duet")) {
      if (activePublicId) {
        return sessionResponse;
      }
      const nextPath = `${normalizedPath}${request.nextUrl.search}`;
      return redirectToSignIn(request, locale, nextPath);
    }

    if (activePublicId) {
      return sessionResponse;
    }
    return redirectToPublicHome(request, locale);
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
