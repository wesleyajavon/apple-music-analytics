import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/error-handler";
import { requireDuetCompareAccess } from "@/lib/services/duet/duet-compare-guard";
import { getCompareMetadata } from "@/lib/services/duet/compare-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/duet/compare/metadata";

export async function GET(request: NextRequest) {
  try {
    const access = await requireDuetCompareAccess(request, ROUTE, "aggregates");
    if (!access.ok) return access.response;

    const result = await getCompareMetadata(access.viewerId, access.friendUserId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
