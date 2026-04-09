import { NextRequest, NextResponse } from "next/server";
import { createValidationError } from "@/lib/utils/error-handler";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";

const IMPORT_ADMIN_HEADER = "x-import-admin-key";

export async function resolveImportUserId(
  request: NextRequest,
  bodyUserId: unknown
): Promise<
  | { ok: true; userId: string; mode: "session" | "admin" }
  | { ok: false; response: NextResponse }
> {
  const configuredAdminKey = process.env.IMPORT_ADMIN_KEY?.trim();
  const providedAdminKey = request.headers.get(IMPORT_ADMIN_HEADER)?.trim();
  const hasAdminMode =
    !!configuredAdminKey && providedAdminKey === configuredAdminKey;

  if (hasAdminMode) {
    if (!bodyUserId || typeof bodyUserId !== "string") {
      throw createValidationError(
        "userId is required and must be a string when using admin import mode",
        { bodyUserId }
      );
    }
    return { ok: true, userId: bodyUserId, mode: "admin" };
  }

  const sessionUserId = await getCurrentUserId(request);
  if (sessionUserId) {
    return { ok: true, userId: sessionUserId, mode: "session" };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "Authentication required",
        message:
          configuredAdminKey
            ? "Use an authenticated session or provide x-import-admin-key for script/admin imports."
            : "Use an authenticated session. To enable script/admin imports, configure IMPORT_ADMIN_KEY.",
      },
      { status: 401 }
    ),
  };
}
