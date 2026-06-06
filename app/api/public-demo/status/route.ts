import { NextResponse } from "next/server";
import { resolveActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const ROUTE = "/api/public-demo/status";

/** Public read-only: whether the configured demo account has opted in. */
export async function GET() {
  try {
    const userId = await resolveActivePublicProfileUserId();
    return NextResponse.json({
      active: userId !== null,
      userId,
    });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
