import { NextRequest, NextResponse } from "next/server";
import {
  getRateLimitBlockedInCurrentMinute,
  getRateLimitTopBlockedSubjects,
} from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const RATE_LIMIT_ADMIN_HEADER = "x-admin-key";
const IMPORT_ADMIN_HEADER = "x-import-admin-key";

function parsePositiveInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function getConfiguredAdminKey(): string | null {
  const dedicated = process.env.RATE_LIMIT_ADMIN_KEY?.trim();
  if (dedicated) return dedicated;
  const shared = process.env.IMPORT_ADMIN_KEY?.trim();
  if (shared) return shared;
  return null;
}

function hasValidAdminKey(request: NextRequest): boolean {
  const configured = getConfiguredAdminKey();
  if (!configured) return false;
  const fromAdminHeader = request.headers.get(RATE_LIMIT_ADMIN_HEADER)?.trim();
  const fromImportHeader = request.headers.get(IMPORT_ADMIN_HEADER)?.trim();
  return fromAdminHeader === configured || fromImportHeader === configured;
}

export async function GET(request: NextRequest) {
  try {
    if (!hasValidAdminKey(request)) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Provide a valid admin key in x-admin-key (or x-import-admin-key).",
        },
        { status: 401 }
      );
    }

    const route = request.nextUrl.searchParams.get("route")?.trim();
    if (!route) {
      return NextResponse.json(
        {
          error: "Invalid input",
          code: "VALIDATION_ERROR",
          message: "Query parameter `route` is required.",
        },
        { status: 400 }
      );
    }

    const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit"), 10, 1, 100);
    const spikeAlertThreshold = parsePositiveInt(
      request.nextUrl.searchParams.get("spikeAlertThreshold"),
      Number.parseInt(process.env.RATE_LIMIT_SPIKE_ALERT_THRESHOLD ?? "20", 10) || 20,
      1,
      10_000
    );

    const [blockedInCurrentMinute, topBlockedSubjects] = await Promise.all([
      getRateLimitBlockedInCurrentMinute(route),
      getRateLimitTopBlockedSubjects(route, limit),
    ]);

    return NextResponse.json({
      route,
      blockedInCurrentMinute,
      spikeAlertThreshold,
      topBlockedSubjects,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/rate-limit/top-blocked" });
  }
}
