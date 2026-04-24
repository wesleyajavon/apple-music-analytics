import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const ROUTE = "/api/user/me";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    return NextResponse.json({ user: { name: user?.name ?? null } });
  } catch (error) {
    return handleApiError(error, { route: ROUTE });
  }
}
