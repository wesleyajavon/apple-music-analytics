import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  AI_MASTER_DISABLED_COOKIE,
  isAiMasterEnvEnabled,
  isAiMasterEnabledForRequest,
} from "../ai-master";

describe("ai-master", () => {
  beforeEach(() => {
    delete process.env.AI_MASTER_ENABLED;
  });

  afterEach(() => {
    delete process.env.AI_MASTER_ENABLED;
  });

  it("isAiMasterEnvEnabled is false only when AI_MASTER_ENABLED is the string false", () => {
    expect(isAiMasterEnvEnabled()).toBe(true);
    process.env.AI_MASTER_ENABLED = "false";
    expect(isAiMasterEnvEnabled()).toBe(false);
  });

  it("isAiMasterEnabledForRequest respects env off", () => {
    process.env.AI_MASTER_ENABLED = "false";
    const req = new NextRequest("http://localhost/");
    expect(isAiMasterEnabledForRequest(req)).toBe(false);
  });

  it("isAiMasterEnabledForRequest is false when cookie disables", () => {
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `${AI_MASTER_DISABLED_COOKIE}=1` },
    });
    expect(isAiMasterEnabledForRequest(req)).toBe(false);
  });

  it("isAiMasterEnabledForRequest is true without cookie when env on", () => {
    const req = new NextRequest("http://localhost/");
    expect(isAiMasterEnabledForRequest(req)).toBe(true);
  });
});
