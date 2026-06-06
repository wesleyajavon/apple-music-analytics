function isProductionEnv() {
  return process.env.NODE_ENV === "production";
}

/** @returns {string} */
function buildContentSecurityPolicy() {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    // Next.js / Sentry / bundlers often spawn Web Workers from blob: URLs.
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.scdn.co https://*.supabase.co https://ui-avatars.com https://lastfm.freetls.fastly.net",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
      "https://*.ingest.us.sentry.io",
      "https://vitals.vercel-insights.com",
      "https://va.vercel-scripts.com",
    ].join(" "),
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ];

  if (isProductionEnv()) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** @returns {Array<{ key: string, value: string }>} */
function buildSecurityHeaders() {
  /** @type {Array<{ key: string, value: string }>} */
  const headers = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  ];

  if (isProductionEnv()) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}

module.exports = { buildContentSecurityPolicy, buildSecurityHeaders };
