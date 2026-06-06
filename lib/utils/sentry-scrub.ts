type SentryEventLike = {
  user?: Record<string, unknown>;
  request?: {
    cookies?: unknown;
    headers?: Record<string, string>;
    query_string?: string;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_RE = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g;

function scrubString(value: string): string {
  return value.replace(EMAIL_RE, "[email redacted]").replace(JWT_RE, "[jwt redacted]");
}

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("email") ||
        lower.includes("password") ||
        lower.includes("token") ||
        lower.includes("authorization") ||
        lower === "cookie" ||
        lower === "cookies"
      ) {
        out[key] = "[redacted]";
      } else {
        out[key] = scrubValue(nested);
      }
    }
    return out;
  }
  return value;
}

/** Strip common PII from Sentry events before upload. */
export function scrubSentryEvent<T extends SentryEventLike>(event: T): T | null {
  if (event.user) {
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }

  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (
          lower === "authorization" ||
          lower === "cookie" ||
          lower === "x-import-admin-key" ||
          lower === "x-admin-key"
        ) {
          headers[key] = "[redacted]";
        }
      }
      event.request.headers = headers;
    }
    if (typeof event.request.query_string === "string") {
      event.request.query_string = scrubString(event.request.query_string);
    }
  }

  if (event.extra) {
    event.extra = scrubValue(event.extra) as Record<string, unknown>;
  }

  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as typeof event.contexts;
  }

  return event;
}
