import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { recordUserConsent } from "@/lib/services/user/consent-service";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/consent";

const ConsentSchema = z.object({
  consentType: z.enum(["cookie", "terms", "groq_genre", "ai_master", "public_profile"]),
  consentVersion: z.string().min(1).max(64),
  granted: z.boolean(),
  categories: z.record(z.boolean()).optional(),
  anonymousId: z.string().max(128).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = ConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid consent payload", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    await recordUserConsent({
      userId,
      anonymousId: parsed.data.anonymousId ?? null,
      consentType: parsed.data.consentType,
      consentVersion: parsed.data.consentVersion,
      granted: parsed.data.granted,
      categories: parsed.data.categories ?? null,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
