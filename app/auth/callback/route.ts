import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { routing } from "@/i18n/routing";
import { readAnonymousIdFromRequest } from "@/lib/auth/anonymous-id-cookie";
import {
  clearOAuthTermsCookie,
  oauthTermsCookieMatchesVersion,
  readOAuthTermsCookie,
} from "@/lib/auth/oauth-terms-cookie";
import { linkAnonymousConsentsToUser } from "@/lib/services/user/link-anonymous-consents";
import { ensureAppUserFromSession } from "@/lib/auth/ensure-app-user-from-session";
import { persistSpotifyConnectionFromSupabaseSession } from "@/lib/services/spotify/persist-connection-from-session";
import { hasTermsConsent } from "@/lib/services/user/has-terms-consent";
import { recordTermsConsentIfNeeded } from "@/lib/services/user/terms-consent";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

function getSafeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/")) return "/dashboard";
  if (rawNext.startsWith("//")) return "/dashboard";
  return rawNext;
}

const DETAIL_PARAM_MAX_LEN = 500;

const EMAIL_CONFIRMATION_OTP_TYPES = new Set<EmailOtpType>(["email", "signup"]);

function isEmailConfirmationOtpType(type: string | null): type is EmailOtpType {
  return type !== null && EMAIL_CONFIRMATION_OTP_TYPES.has(type as EmailOtpType);
}

function truncateDetail(message: string): string {
  return message.length > DETAIL_PARAM_MAX_LEN
    ? `${message.slice(0, DETAIL_PARAM_MAX_LEN)}…`
    : message;
}

function redirectToSignInWithError(
  origin: string,
  next: string,
  detail: string
): NextResponse {
  const signIn = new URL(`/${routing.defaultLocale}/sign-in`, origin);
  signIn.searchParams.set("oauth_error", "1");
  signIn.searchParams.set("detail", truncateDetail(detail));
  signIn.searchParams.set("next", next);
  return NextResponse.redirect(signIn);
}

async function persistAuthenticatedSession(session: Session | null): Promise<void> {
  if (!session) return;

  try {
    await ensureAppUserFromSession(session.user);
    await persistSpotifyConnectionFromSupabaseSession(session);
  } catch (e) {
    logger.error("[auth/callback] post-session persist failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

function setRedirectTarget(response: NextResponse, url: URL): NextResponse {
  response.headers.set("Location", url.toString());
  return response;
}

async function buildPostAuthRedirect(
  session: Session | null,
  request: NextRequest,
  next: string,
  origin: string,
  options: { emailSignupConfirmed?: boolean },
  authResponse: NextResponse
): Promise<NextResponse> {
  const target = new URL(next, origin);

  if (!session?.user?.id) {
    return setRedirectTarget(authResponse, target);
  }

  await persistAuthenticatedSession(session);

  const anonymousId = readAnonymousIdFromRequest(request);
  if (anonymousId) {
    try {
      await linkAnonymousConsentsToUser(session.user.id, anonymousId);
    } catch (e) {
      logger.warn("[auth/callback] link anonymous consents failed", {
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (options.emailSignupConfirmed) {
    await recordTermsConsentIfNeeded(session.user.id, request);
    return setRedirectTarget(authResponse, target);
  }

  const oauthTerms = readOAuthTermsCookie(request);

  if (oauthTermsCookieMatchesVersion(oauthTerms)) {
    clearOAuthTermsCookie(authResponse);
    await recordTermsConsentIfNeeded(session.user.id, request);
    return setRedirectTarget(authResponse, target);
  }

  if (!(await hasTermsConsent(session.user.id))) {
    const acceptUrl = new URL(`/${routing.defaultLocale}/accept-terms`, origin);
    acceptUrl.searchParams.set("next", next);
    clearOAuthTermsCookie(authResponse);
    return setRedirectTarget(authResponse, acceptUrl);
  }

  clearOAuthTermsCookie(authResponse);
  return setRedirectTarget(authResponse, target);
}

export async function GET(request: Request) {
  try {
    return await handleAuthCallback(request);
  } catch (e) {
    logger.error("[auth/callback] unexpected error", {
      message: e instanceof Error ? e.message : String(e),
    });
    const url = new URL(request.url);
    const next = getSafeNextPath(url.searchParams.get("next"));
    const signIn = new URL(`/${routing.defaultLocale}/sign-in`, url.origin);
    signIn.searchParams.set("oauth_error", "1");
    signIn.searchParams.set(
      "detail",
      "Échec du retour d'authentification. Veuillez réessayer."
    );
    signIn.searchParams.set("next", next);
    return NextResponse.redirect(signIn);
  }
}

async function handleAuthCallback(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const next = getSafeNextPath(url.searchParams.get("next"));
  const oauthErr = url.searchParams.get("error");
  const nextRequest = request as NextRequest;

  if (oauthErr) {
    const rawDetail =
      url.searchParams.get("error_description")?.trim() || oauthErr;

    return redirectToSignInWithError(url.origin, next, rawDetail);
  }

  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type");

  if (tokenHash && isEmailConfirmationOtpType(otpType)) {
    const successRedirect = NextResponse.redirect(new URL(next, url.origin));
    const supabase = await createSupabaseRouteHandlerClient(successRedirect);
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      return redirectToSignInWithError(url.origin, next, error.message);
    }

    return buildPostAuthRedirect(
      data.session,
      nextRequest,
      next,
      url.origin,
      { emailSignupConfirmed: true },
      successRedirect
    );
  }

  const code = url.searchParams.get("code");

  if (code) {
    const successRedirect = NextResponse.redirect(new URL(next, url.origin));
    const supabase = await createSupabaseRouteHandlerClient(successRedirect);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToSignInWithError(url.origin, next, error.message);
    }

    return buildPostAuthRedirect(
      data.session,
      nextRequest,
      next,
      url.origin,
      { emailSignupConfirmed: false },
      successRedirect
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
