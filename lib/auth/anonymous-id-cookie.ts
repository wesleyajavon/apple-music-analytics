import type { NextRequest } from "next/server";

export const ANONYMOUS_ID_COOKIE = "ama_anonymous_id";

function readCookieValue(request: NextRequest, name: string): string | null {
  if ("cookies" in request && typeof request.cookies?.get === "function") {
    const fromCookies = request.cookies.get(name)?.value;
    if (fromCookies) return fromCookies;
  }
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.slice(name.length + 1);
    }
  }
  return null;
}

export function readAnonymousIdFromRequest(request: NextRequest): string | null {
  const raw = readCookieValue(request, ANONYMOUS_ID_COOKIE);
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 && trimmed.length <= 128 ? trimmed : null;
}
