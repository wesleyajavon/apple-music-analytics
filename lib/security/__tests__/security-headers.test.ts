import { describe, expect, it, afterEach } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "../security-headers.js";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

describe("security-headers", () => {
  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it("includes CSP with Supabase and Sentry hosts", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("https://*.supabase.co");
    expect(csp).toContain("https://*.ingest.sentry.io");
    expect(csp).toContain("https://vercel.live");
  });

  it("adds HSTS only in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const devHeaders = buildSecurityHeaders();
    expect(devHeaders.some((h) => h.key === "Strict-Transport-Security")).toBe(false);

    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const prodHeaders = buildSecurityHeaders();
    const hsts = prodHeaders.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts?.value).toContain("max-age=");
  });
});
