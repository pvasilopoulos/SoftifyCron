import { describe, expect, it } from "vitest";
import {
  DEFAULT_TELEGRAM_TEMPLATE,
  interpolateNotifyTemplate,
  notifyVarsFrom,
  sampleNotifyVars,
  TELEGRAM_MAX_CHARS,
} from "./notify-template";

describe("telegram templates", () => {
  it("fills known placeholders and drops unknown ones", () => {
    const text = interpolateNotifyTemplate(
      "{{subject}}\n{{job.name}} {{missing}}\n{{error}}",
      sampleNotifyVars(),
    );
    expect(text).toContain("[SoftifyCron] Site ping failed");
    expect(text).toContain("Site ping");
    expect(text).not.toContain("missing");
    expect(text).toContain("Error: HTTP 503");
  });

  it("collapses blank optional lines", () => {
    const vars = notifyVarsFrom({
      jobId: "j1",
      jobName: "Ping",
      tenantName: "Acme",
      status: "SUCCESS",
      events: ["recovery"],
      failures: 0,
      subject: "recovered",
      jobUrl: "https://example.com/jobs/j1",
      httpStatus: null,
      error: null,
      paused: false,
      ackUrl: null,
    });
    const text = interpolateNotifyTemplate(DEFAULT_TELEGRAM_TEMPLATE, vars);
    expect(text).toContain("recovered");
    expect(text).not.toContain("Ack:");
    expect(text).not.toContain("Error:");
    expect(text).not.toContain("HTTP:");
    expect(text).not.toMatch(/\n{3,}/);
  });

  it("truncates to Telegram’s cap", () => {
    const huge = `{{note}}${"x".repeat(TELEGRAM_MAX_CHARS + 50)}`;
    expect(interpolateNotifyTemplate(huge, { note: "n" }).length).toBe(TELEGRAM_MAX_CHARS);
  });

  it("strips leftover mustaches so secrets cannot leak as placeholders", () => {
    const text = interpolateNotifyTemplate("Hi {{SECRET:API_TOKEN}} {{job.name}}", sampleNotifyVars());
    expect(text).toContain("Site ping");
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("{{");
  });
});
