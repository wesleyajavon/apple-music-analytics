import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import { linkAnonymousConsentsToUser } from "@/lib/services/user/link-anonymous-consents";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/consent/link-anonymous";

const BodySchema = z.object({
  anonymousId: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return unauthorizedResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid anonymousId", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const linked = await linkAnonymousConsentsToUser(userId, parsed.data.anonymousId);
    return NextResponse.json({ ok: true, linked });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
