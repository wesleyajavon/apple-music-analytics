import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "@/lib/utils/sentry-scrub";

describe("scrubSentryEvent", () => {
  it("removes user email and sensitive headers", () => {
    const event = {
      user: { id: "abc", email: "user@example.com", username: "user@example.com" },
      request: {
        cookies: { session: "secret" },
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def",
          "x-import-admin-key": "admin-secret",
        },
        query_string: "email=user@example.com",
      },
      extra: { password: "123456" },
    };

    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed?.user?.email).toBeUndefined();
    expect(scrubbed?.request?.cookies).toBeUndefined();
    expect(scrubbed?.request?.headers?.Authorization).toBe("[redacted]");
    expect(scrubbed?.request?.query_string).toContain("[email redacted]");
    expect(scrubbed?.extra?.password).toBe("[redacted]");
  });
});
