import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAuthUserByEmail } from "@/lib/auth/find-auth-user-by-email";
import {
  getOAuthSignInProviders,
  isOAuthOnlyAccount,
} from "@/lib/auth/password-reset-eligibility";
import { routing } from "@/i18n/routing";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { handleApiError } from "@/lib/utils/error-handler";
import type { ForgotPasswordResponse } from "@/lib/auth/forgot-password-types";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ROUTE = "/api/auth/forgot-password";

const RATE_LIMIT = {
  route: ROUTE,
  windowMs: 15 * 60_000,
  maxRequests: 10,
} as const;

const ForgotPasswordBodySchema = z.object({
  email: z.string().email().max(320),
  locale: z.enum(routing.locales).optional(),
});

function buildPasswordResetRedirectUrl(request: NextRequest, locale: string): string {
  const origin = new URL(request.url).origin;
  // Direct link: recovery emails use hash tokens that a server redirect (e.g. /auth/callback) would drop.
  return `${origin}/${locale}/update-password`;
}

export async function POST(request: NextRequest) {
  try {
    await assertRateLimit(request, RATE_LIMIT);

    const body = ForgotPasswordBodySchema.parse(await request.json());
    const locale = body.locale ?? routing.defaultLocale;
    const redirectTo = buildPasswordResetRedirectUrl(request, locale);

    const admin = getSupabaseAdminClient();
    if (admin) {
      const user = await findAuthUserByEmail(admin, body.email);

      if (user && isOAuthOnlyAccount(user)) {
        const payload: ForgotPasswordResponse = {
          outcome: "oauth_only",
          providers: getOAuthSignInProviders(user),
        };
        return NextResponse.json(payload);
      }
    }

    const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
    const supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo,
    });

    if (error) {
      throw error;
    }

    const payload: ForgotPasswordResponse = { outcome: "email_sent" };
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
