import { afterEach, describe, expect, it } from "vitest";
import {
  cronSecretConfigured,
  cronSecretFromRequest,
  verifyCronSecret,
} from "./cron-secret";

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

describe("cronSecretFromRequest", () => {
  it("reads query, bearer, and custom header", () => {
    expect(
      cronSecretFromRequest(new Request("https://cron.example/api/cron/tick?secret=q1")),
    ).toBe("q1");
    expect(
      cronSecretFromRequest(
        new Request("https://cron.example/api/cron/tick", {
          headers: { authorization: "Bearer h2" },
        }),
      ),
    ).toBe("h2");
    expect(
      cronSecretFromRequest(
        new Request("https://cron.example/api/cron/tick", {
          headers: { "x-cron-secret": "h3" },
        }),
      ),
    ).toBe("h3");
  });
});

describe("verifyCronSecret", () => {
  it("rejects when unset or wrong", () => {
    delete process.env.CRON_SECRET;
    expect(cronSecretConfigured()).toBe(false);
    expect(verifyCronSecret("nope")).toBe(false);
    process.env.CRON_SECRET = "correct-secret";
    expect(cronSecretConfigured()).toBe(true);
    expect(verifyCronSecret("wrong-secret")).toBe(false);
    expect(verifyCronSecret("correct-secret")).toBe(true);
  });
});
