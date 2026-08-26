import { describe, expect, it } from "vitest";
import { ipAllowed, parseAllowlist } from "./allowlist";
import { checkLiteSchema, parseLiteSchema } from "./json-schema";
import { parseRdapExpiry, rdapUrl } from "./rdap";
import { parseHostList } from "./hosts-list";
import { redactSecrets } from "./redact";
import { flapLabel, flapScore } from "./flap";
import { whyNotFired } from "./why-skipped";
import { capHit, capWarn } from "./caps";
import { calendarIcs } from "./ical";
import { csvEscape, monthlyOpsCsv } from "./report";
import { signAckToken, verifyAckToken } from "./ack-token";
import { parseHookHmac, verifyGithubSignature, verifyGitlabToken } from "./hook-hmac";
import { deadSecretKeys, secretKeysInText } from "./dead-secrets";
import { matchJobName, parseBotCommand } from "./bot-commands";
import { hashRecoveryCode } from "./recovery-codes";
import { statusBadgeSvg } from "./status-badge";
import { parseRdapExpiry as parseExpiry } from "./rdap";

describe("allowlist", () => {
  it("parses and matches CIDR", () => {
    expect(parseAllowlist("10.0.0.1, 10.1.0.0/16")).toEqual(["10.0.0.1", "10.1.0.0/16"]);
    expect(ipAllowed("10.0.0.1", ["10.0.0.1"])).toBe(true);
    expect(ipAllowed("10.1.2.3", ["10.1.0.0/16"])).toBe(true);
    expect(ipAllowed("11.0.0.1", ["10.0.0.0/8"])).toBe(false);
    expect(ipAllowed("1.2.3.4", [])).toBe(true);
  });
});

describe("json schema lite", () => {
  it("checks type and required keys", () => {
    const schema = parseLiteSchema('{"type":"object","required":["ok"],"properties":{"ok":{"type":"boolean"}}}');
    expect(checkLiteSchema('{"ok":true}', schema)).toBeNull();
    expect(checkLiteSchema("{}", schema)).toMatch(/required/);
    expect(checkLiteSchema('{"ok":"yes"}', schema)).toMatch(/boolean/);
  });
});

describe("rdap", () => {
  it("builds URL and reads expiry", () => {
    expect(rdapUrl("Example.COM")).toBe("https://rdap.org/domain/example.com");
    const parsed = parseRdapExpiry({
      events: [{ eventAction: "expiration", eventDate: "2030-01-01T00:00:00Z" }],
    }, new Date("2026-01-01T00:00:00Z"));
    expect(parsed.days).toBeGreaterThan(1000);
    expect(parseExpiry({ events: [] }).expiresAt).toBeNull();
  });
});

describe("ops helpers", () => {
  it("parses hosts, redacts, flaps, and caps", () => {
    expect(parseHostList("a.com\nb.com, c.com")).toEqual(["a.com", "b.com", "c.com"]);
    expect(redactSecrets("token=abcde-secret", ["abcde-secret"])).toBe("token=[redacted]");
    expect(flapScore(["SUCCESS", "FAILED", "SUCCESS", "FAILED"])).toBe(3);
    expect(flapLabel(6)).toBe("flapping");
    expect(capHit(10, 10)).toBe(true);
    expect(capWarn(8, 10)).toBe(true);
    expect(capHit(3, 0)).toBe(false);
  });

  it("explains skipped fires", () => {
    const reasons = whyNotFired({
      enabled: false,
      cronExpr: "*/5 * * * *",
      timezone: "UTC",
      nextRunAt: new Date(Date.now() + 60_000),
      schedule: { timezone: "UTC", snoozeUntil: new Date(Date.now() + 3_600_000) },
      tenantHolidays: false,
      capRunsMonth: 10,
      runsMonth: 10,
    });
    expect(reasons).toContain("paused");
    expect(reasons).toContain("snoozed");
    expect(reasons).toContain("monthly run cap");
  });

  it("builds ics and csv", () => {
    const ics = calendarIcs(
      [{ id: "j1", name: "Ping", cronExpr: "0 9 * * *", timezone: "UTC", lastStatus: "SUCCESS", nextRunAt: null }],
      false,
      "Ops",
      new Date("2026-08-26T00:00:00Z"),
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("Ping");
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(monthlyOpsCsv([{ job: "Ping", type: "HTTP", runs: 2, failed: 1, incidents: 1, openMinutes: 12 }])).toContain("Ping");
  });

  it("signs ack tokens and webhook hmac", () => {
    process.env.AUTH_SECRET ??= "test-secret-for-ops-next";
    const token = signAckToken("job1", "ten1", 60_000);
    expect(verifyAckToken(token)).toEqual({ jobId: "job1", tenantId: "ten1" });
    expect(verifyAckToken("nope")).toBeNull();
    expect(parseHookHmac("GitHub")).toBe("github");
    expect(verifyGithubSignature("s3cret", '{"ok":true}', "sha256=dead")).toBe(false);
    expect(verifyGitlabToken("hook", "hook")).toBe(true);
    expect(verifyGitlabToken("hook", "nope")).toBe(false);
  });

  it("parses bot commands and dead secrets", () => {
    expect(parseBotCommand("/ack Ping please")).toEqual({ kind: "ack", query: "Ping", note: "please" });
    expect(parseBotCommand("/snooze Checkout 8")).toEqual({ kind: "snooze", query: "Checkout", hours: 8 });
    expect(parseBotCommand("/run Site")).toEqual({ kind: "run", query: "Site" });
    expect(matchJobName([{ id: "1", name: "Site ping" }], "site")).toMatchObject({ id: "1" });
    expect(secretKeysInText("{{SECRET:API_TOKEN}} and {{SECRET:API_TOKEN}}")).toEqual(["API_TOKEN"]);
    expect(deadSecretKeys(["{{SECRET:MISSING}}"], ["API_TOKEN"])).toEqual(["MISSING"]);
    expect(hashRecoveryCode("abc")).toHaveLength(64);
    expect(statusBadgeSvg("Aurora", true)).toContain("operational");
    expect(statusBadgeSvg("Aurora", false)).toContain("degraded");
  });
});
