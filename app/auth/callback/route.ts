import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { ensureAppUserFromSession } from "@/lib/auth/ensure-app-user-from-session";
import { persistSpotifyConnectionFromSupabaseSession } from "@/lib/services/spotify/persist-connection-from-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/")) return "/dashboard";
  if (rawNext.startsWith("//")) return "/dashboard";
  return rawNext;
}

const DETAIL_PARAM_MAX_LEN = 500;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeNextPath(url.searchParams.get("next"));
  const oauthErr = url.searchParams.get("error");

  if (oauthErr) {
    const rawDetail =
      url.searchParams.get("error_description")?.trim() || oauthErr;
    const detail =
      rawDetail.length > DETAIL_PARAM_MAX_LEN
        ? `${rawDetail.slice(0, DETAIL_PARAM_MAX_LEN)}…`
        : rawDetail;

    const signIn = new URL(`/${routing.defaultLocale}/sign-in`, url.origin);
    signIn.searchParams.set("oauth_error", "1");
    signIn.searchParams.set("detail", detail);
    signIn.searchParams.set("next", next);
    return NextResponse.redirect(signIn);
  }

  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      await ensureAppUserFromSession(data.session.user);
      await persistSpotifyConnectionFromSupabaseSession(data.session);
    }
    if (error) {
      const signIn = new URL(`/${routing.defaultLocale}/sign-in`, url.origin);
      signIn.searchParams.set("oauth_error", "1");
      signIn.searchParams.set(
        "detail",
        error.message.length > DETAIL_PARAM_MAX_LEN
          ? `${error.message.slice(0, DETAIL_PARAM_MAX_LEN)}…`
          : error.message
      );
      signIn.searchParams.set("next", next);
      return NextResponse.redirect(signIn);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
