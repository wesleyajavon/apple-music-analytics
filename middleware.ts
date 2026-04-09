import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

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

export default async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);
  const { response: sessionResponse, user } = await updateSession(request, response);

  const normalizedPath = getPathWithoutLocalePrefix(request.nextUrl.pathname);
  const isDashboardRoute =
    normalizedPath === "/dashboard" || normalizedPath.startsWith("/dashboard/");

  if (isDashboardRoute && !user) {
    const locale = getLocaleFromPathname(request.nextUrl.pathname);
    const publicHomePath = locale ? `/${locale}` : "/";
    return NextResponse.redirect(new URL(publicHomePath, request.url));
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
