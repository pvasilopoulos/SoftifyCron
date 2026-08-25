import { describe, expect, it } from "vitest";
import {
  applyQuietHours,
  inQuietHours,
  parseChatIds,
  parseChatIdsStrict,
  parseClockMinutes,
  parseEmails,
  parseEmailsStrict,
} from "./notify-policy";
import { parseSmtpPort } from "./notify-policy";
import { signWebhookBody, verifyWebhookSignature, webhookSignatureHeader } from "./notify-sign";
import { cronIntervalMs, isHeartbeatStale } from "./cron";
import { eventsForRun } from "./notify-events";

describe("notify recipients", () => {
  it("parses unique emails", () => {
    expect(parseEmails("Ops@X.com, oncall@x.com; ops@x.com\nbad")).toEqual([
      "ops@x.com",
      "oncall@x.com",
    ]);
  });

  it("rejects mixed invalid emails in strict mode", () => {
    expect(() => parseEmailsStrict("ops@x.com, nope")).toThrow(/valid emails/);
    expect(parseEmailsStrict("")).toEqual([]);
  });

  it("parses telegram chat ids", () => {
    expect(parseChatIds("-1001234567890, 123456789")).toEqual(["-1001234567890", "123456789"]);
    expect(() => parseChatIdsStrict("!!")).toThrow(/chat ids/);
  });
});

describe("quiet hours", () => {
  it("parses HH:mm", () => {
    expect(parseClockMinutes("23:00")).toBe(23 * 60);
    expect(parseClockMinutes("7:05")).toBe(7 * 60 + 5);
    expect(parseClockMinutes("")).toBeNull();
  });

  it("handles overnight windows in a timezone", () => {
    const evening = new Date("2026-08-25T20:30:00.000Z");
    const morning = new Date("2026-08-25T04:30:00.000Z");
    const midday = new Date("2026-08-25T12:00:00.000Z");
    expect(inQuietHours(evening, "UTC", "23:00", "07:00")).toBe(false);
    expect(inQuietHours(new Date("2026-08-25T23:15:00.000Z"), "UTC", "23:00", "07:00")).toBe(true);
    expect(inQuietHours(morning, "UTC", "23:00", "07:00")).toBe(true);
    expect(inQuietHours(midday, "UTC", "23:00", "07:00")).toBe(false);
  });

  it("drops non-allowed events during quiet hours", () => {
    const events = applyQuietHours(["success", "failure"], {
      now: new Date("2026-08-25T23:15:00.000Z"),
      timeZone: "UTC",
      start: "23:00",
      end: "07:00",
      allow: "failure,missed",
    });
    expect(events).toEqual(["failure"]);
  });
});

describe("webhook signatures", () => {
  it("round-trips hmac", () => {
    const secret = "whsec_test";
    const timestamp = "1700000000";
    const body = '{"event":"job.failed"}';
    const header = webhookSignatureHeader(secret, timestamp, body);
    expect(header.startsWith("sha256=")).toBe(true);
    expect(signWebhookBody(secret, timestamp, body)).toHaveLength(64);
    expect(verifyWebhookSignature({ secret, timestamp, body, signature: header })).toBe(true);
    expect(
      verifyWebhookSignature({ secret, timestamp, body, signature: "sha256=deadbeef" }),
    ).toBe(false);
  });
});

describe("smtp port", () => {
  it("falls back when empty or invalid", () => {
    expect(parseSmtpPort("")).toBe(587);
    expect(parseSmtpPort(0)).toBe(587);
    expect(parseSmtpPort("465")).toBe(465);
  });
});

describe("heartbeat stale", () => {
  it("measures cron interval", () => {
    const from = new Date("2026-08-25T12:00:00.000Z");
    expect(cronIntervalMs("0 * * * *", "UTC", from)).toBe(60 * 60 * 1000);
  });

  it("treats a silent heartbeat job as stale", () => {
    const now = new Date("2026-08-25T12:10:00.000Z");
    expect(
      isHeartbeatStale(
        {
          cronExpr: "* * * * *",
          timezone: "UTC",
          createdAt: new Date("2026-08-25T12:00:00.000Z"),
          lastHeartbeatAt: null,
          lastRunAt: null,
          lastStatus: null,
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("late schedule", () => {
  it("adds missed when a run starts late", () => {
    expect(
      eventsForRun({ status: "FAILED", previousFailures: 0, lateMs: 180_000 }),
    ).toEqual(["failure", "missed"]);
  });
});
