import { NextRequest, NextResponse } from "next/server";
import { extractOptionalDateRange } from "@/lib/middleware/validation";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  invalidFriendUserIdResponse,
  requireDuetFriendAccess,
} from "@/lib/services/duet/duet-compare-guard";
import { getFriendOverview } from "@/lib/services/duet/friend-overview-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/duet/friend-overview";

export async function GET(request: NextRequest) {
  try {
    const access = await requireDuetFriendAccess(request, ROUTE, "aggregates");
    if (!access.ok) return access.response;

    if (access.viewerId === access.friendUserId) {
      return invalidFriendUserIdResponse();
    }

    const { startDate, endDate } = extractOptionalDateRange(request);
    const result = await getFriendOverview({
      friendUserId: access.friendUserId,
      shareScope: access.shareScope,
      startDate,
      endDate,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
