import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  getPrivacyPreferences,
  grantGroqGenreConsent,
  revokeGroqGenreConsent,
  setPublicProfileOptIn,
} from "@/lib/services/user/privacy-preferences";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/privacy-preferences";

const RATE = {
  route: ROUTE,
  windowMs: 60_000,
  maxRequests: 30,
  softLimitRatio: 0.8,
} as const;

const PatchSchema = z
  .object({
    groqGenreConsent: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
  })
  .refine((body) => body.groqGenreConsent !== undefined || body.publicProfile !== undefined, {
    message: "At least one preference must be provided",
  });

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    const preferences = await getPrivacyPreferences(userId);
    return NextResponse.json(preferences);
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, { ...RATE, userId });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid privacy preferences payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    let jobsCancelled = 0;

    if (parsed.data.groqGenreConsent === true) {
      await grantGroqGenreConsent(userId, request);
    } else if (parsed.data.groqGenreConsent === false) {
      const result = await revokeGroqGenreConsent(userId, request);
      jobsCancelled = result.jobsCancelled;
    }

    if (parsed.data.publicProfile === true || parsed.data.publicProfile === false) {
      try {
        await setPublicProfileOptIn(userId, parsed.data.publicProfile, request);
      } catch (error) {
        if (error instanceof Error && error.message === "PUBLIC_PROFILE_NOT_ELIGIBLE") {
          return NextResponse.json(
            { error: "Public profile is not available for this account", code: "NOT_ELIGIBLE" },
            { status: 403 }
          );
        }
        if (error instanceof Error && error.message === "USER_CONSENT_TABLE_MISSING") {
          return NextResponse.json(
            {
              error: "Consent storage is not ready. Run `npm run db:migrate` and restart the dev server.",
              code: "CONSENT_TABLE_MISSING",
            },
            { status: 503 }
          );
        }
        throw error;
      }
    }

    const preferences = await getPrivacyPreferences(userId);
    return NextResponse.json({ ...preferences, jobsCancelled });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
