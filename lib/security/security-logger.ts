import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";

export type SecurityAuthReason = "unauthorized" | "forbidden" | "rate_limited";

type SecurityAuthLogPayload = {
  route: string;
  statusCode: 401 | 403 | 429;
  reason: SecurityAuthReason;
  userId?: string | null;
  request?: NextRequest;
};

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 24);
}

function getClientIp(request?: NextRequest): string | null {
  if (!request) return null;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  return null;
}

function getAnonymizedClientIdentifier(request?: NextRequest): string {
  const ip = getClientIp(request);
  if (ip) return `ip:${hashIdentifier(ip)}`;

  const ua = request?.headers.get("user-agent")?.trim() ?? "";
  const host = request?.headers.get("host")?.trim() ?? "";
  const fallbackSeed = `${ua}|${host}`.trim();
  if (!fallbackSeed) return "unknown";

  return `fallback:${hashIdentifier(fallbackSeed)}`;
}

export function logSecurityAuthEvent(payload: SecurityAuthLogPayload): void {
  logger.warn("Security/auth route rejection", {
    route: payload.route,
    statusCode: payload.statusCode,
    reason: payload.reason,
    auth: {
      userIdPresent: Boolean(payload.userId?.trim()),
    },
    client: {
      anonymizedId: getAnonymizedClientIdentifier(payload.request),
    },
  });
}
