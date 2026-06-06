import { NextRequest, NextResponse } from "next/server";
import { requireRecentAuthenticatedUser } from "@/lib/auth/require-recent-auth";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";
import { exportAllUserData } from "@/lib/services/user/export-user-data";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/export";

const RATE = {
  route: ROUTE,
  windowMs: 3_600_000,
  maxRequests: 5,
  softLimitRatio: 0.8,
} as const;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRecentAuthenticatedUser(request);
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    await assertRateLimit(request, { ...RATE, userId });

    const payload = await exportAllUserData(userId);
    const filename = `soundprint-user-data-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
