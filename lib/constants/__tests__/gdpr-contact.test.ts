import { describe, it, expect, afterEach } from "vitest";
import { getGdprContactEmail } from "@/lib/constants/gdpr-contact";

describe("getGdprContactEmail", () => {
  const original = process.env.GDPR_CONTACT_EMAIL;

  afterEach(() => {
    if (original === undefined) delete process.env.GDPR_CONTACT_EMAIL;
    else process.env.GDPR_CONTACT_EMAIL = original;
  });

  it("returns null when unset", () => {
    delete process.env.GDPR_CONTACT_EMAIL;
    expect(getGdprContactEmail()).toBeNull();
  });

  it("returns trimmed email when valid", () => {
    process.env.GDPR_CONTACT_EMAIL = "  privacy@example.com  ";
    expect(getGdprContactEmail()).toBe("privacy@example.com");
  });

  it("returns null when value has no @", () => {
    process.env.GDPR_CONTACT_EMAIL = "not-an-email";
    expect(getGdprContactEmail()).toBeNull();
  });
});
