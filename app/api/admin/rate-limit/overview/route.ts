import { NextRequest, NextResponse } from "next/server";
import {
  getRateLimitBlockedInCurrentMinute,
  getRateLimitTopBlockedSubjects,
} from "@/lib/security/rate-limit";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";

const RATE_LIMIT_ADMIN_HEADER = "x-admin-key";
const IMPORT_ADMIN_HEADER = "x-import-admin-key";

const DEFAULT_ROUTES = [
  "/api/ai/artist-trends-commentary",
  "/api/ai/genre-trends-commentary",
  "/api/ai/insights",
  "/api/ai/taste-profile",
  "/api/predictions/listening-habit",
  "/api/listens",
  "/api/artists/trends",
  "/api/artists/trends-chart",
  "/api/genres/trends",
  "/api/temporal-analysis",
  "/api/timeline",
  "/api/overview",
  "/api/export/listens",
  "/api/export/stats",
  "/api/export/report",
  "/api/lastfm/import",
  "/api/replay/import",
] as const;

function parsePositiveInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function parseRoutes(raw: string | null): string[] {
  if (!raw) return [...DEFAULT_ROUTES];
  const values = raw
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  if (values.length === 0) return [...DEFAULT_ROUTES];
  return [...new Set(values)];
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

    const routes = parseRoutes(request.nextUrl.searchParams.get("routes"));
    const perRouteTopLimit = parsePositiveInt(
      request.nextUrl.searchParams.get("perRouteTopLimit"),
      5,
      1,
      50
    );
    const spikeAlertThreshold = parsePositiveInt(
      request.nextUrl.searchParams.get("spikeAlertThreshold"),
      Number.parseInt(process.env.RATE_LIMIT_SPIKE_ALERT_THRESHOLD ?? "20", 10) || 20,
      1,
      10_000
    );

    const routeStats = await Promise.all(
      routes.map(async (route) => {
        const [blockedInCurrentMinute, topBlockedSubjects] = await Promise.all([
          getRateLimitBlockedInCurrentMinute(route),
          getRateLimitTopBlockedSubjects(route, perRouteTopLimit),
        ]);
        return {
          route,
          blockedInCurrentMinute,
          overSpikeThreshold: blockedInCurrentMinute >= spikeAlertThreshold,
          topBlockedSubjects,
        };
      })
    );

    routeStats.sort((a, b) => b.blockedInCurrentMinute - a.blockedInCurrentMinute);
    const totalBlockedInCurrentMinute = routeStats.reduce(
      (sum, item) => sum + item.blockedInCurrentMinute,
      0
    );

    return NextResponse.json({
      routesMonitored: routes.length,
      totalBlockedInCurrentMinute,
      spikeAlertThreshold,
      routeStats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, { route: "/api/admin/rate-limit/overview" });
  }
}
