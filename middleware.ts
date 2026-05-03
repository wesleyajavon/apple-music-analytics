import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";

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

export default async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);
  const { response: sessionResponse, user } = await updateSession(request, response);

  const normalizedPath = getPathWithoutLocalePrefix(request.nextUrl.pathname);
  const isDashboardRoute =
    normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard/");

  if (isDashboardRoute && !user) {
    const publicProfileId = getPublicProfileUserId();
    const userIdParam = request.nextUrl.searchParams.get("userId");
    const locale = getLocaleFromPathname(request.nextUrl.pathname);

    if (normalizedPath === "/dashboard/genres/palette") {
      if (publicProfileId && userIdParam === publicProfileId) {
        return redirectToPublicPaletteFallback(request, locale, publicProfileId);
      }
      return redirectToPublicHome(request, locale);
    }

    if (publicProfileId && userIdParam === publicProfileId) {
      return sessionResponse;
    }
    return redirectToPublicHome(request, locale);
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
