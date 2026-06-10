import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/utils/error-handler";
import { requireDuetCompareAccess } from "@/lib/services/duet/duet-compare-guard";
import { getCompareEntity } from "@/lib/services/duet/compare-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/duet/compare/entity";

const EntityQuerySchema = z.object({
  type: z.enum(["artist", "track", "genre"]),
  entityId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireDuetCompareAccess(request, ROUTE, "aggregates");
    if (!access.ok) return access.response;

    const { searchParams } = request.nextUrl;
    const parsed = EntityQuerySchema.safeParse({
      type: searchParams.get("type"),
      entityId: searchParams.get("entityId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid entity compare parameters", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const result = await getCompareEntity(
      request,
      access.viewerId,
      access.friendUserId,
      parsed.data.type,
      parsed.data.entityId
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
