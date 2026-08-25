import { describe, expect, it } from "vitest";
import {
  channelMatches,
  eventsForRun,
  parseNotifyList,
  serializeNotifyList,
  summarizeNotify,
} from "./notify-events";
import { looksLikeTelegramToken } from "./telegram";

describe("notify events", () => {
  it("parses and de-duplicates lists", () => {
    expect(parseNotifyList("failure, timeout, nope, FAILURE")).toEqual(["failure", "timeout"]);
    expect(serializeNotifyList(["pause", "failure", "pause"])).toBe("failure,pause");
  });

  it("maps run outcomes to events", () => {
    expect(eventsForRun({ status: "SUCCESS", previousFailures: 0 })).toEqual(["success"]);
    expect(eventsForRun({ status: "SUCCESS", previousFailures: 2 })).toEqual(["recovery"]);
    expect(eventsForRun({ status: "TIMEOUT", previousFailures: 1, paused: true })).toEqual([
      "timeout",
      "pause",
    ]);
    expect(eventsForRun({ status: "BLOCKED", previousFailures: 0 })).toEqual(["blocked"]);
    expect(eventsForRun({ status: "FAILED", previousFailures: 0 })).toEqual(["failure"]);
  });

  it("matches a channel when any selected event fired", () => {
    expect(channelMatches("failure,pause", ["timeout"])).toBe(false);
    expect(channelMatches("failure,pause", ["timeout", "pause"])).toBe(true);
  });

  it("summarizes enabled channels and skips webhook without a URL", () => {
    const rows = summarizeNotify({
      notifyEmailOn: "failure,success",
      notifyTelegramOn: "failure",
      notifyWebhookOn: "failure,success",
      notifySlackOn: "failure",
      notifyUrl: null,
    });
    expect(rows).toEqual([
      { event: "failure", channels: ["email", "telegram", "slack"] },
      { event: "success", channels: ["email"] },
    ]);
  });
});

describe("telegram token", () => {
  it("accepts botfather-style tokens", () => {
    expect(looksLikeTelegramToken("123456789:AAExampleTokenValueHere12345")).toBe(true);
    expect(looksLikeTelegramToken("not-a-token")).toBe(false);
  });
});
