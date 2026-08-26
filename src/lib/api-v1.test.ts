import { describe, expect, it } from "vitest";
import {
  expandApiScopes,
  hasApiScope,
  parseApiScopes,
  resolveStoredScopes,
  serializeApiScopes,
} from "./api-scopes";
import { API_ENDPOINTS, apiCurl, buildOpenApiDoc } from "./openapi";
import { APP_DOC_SECTIONS, searchDocSections } from "./app-docs";
import { publicJob, publicRun } from "./api-public";
import { parseTakeSkip } from "./api-http";

describe("api scopes", () => {
  it("treats empty stored scopes as legacy full access", () => {
    expect(resolveStoredScopes("")).toEqual([
      "jobs.read",
      "jobs.write",
      "jobs.run",
      "jobs.delete",
      "runs.read",
    ]);
  });

  it("expands write to include read", () => {
    expect(expandApiScopes(["jobs.write"])).toEqual(["jobs.read", "jobs.write"]);
    expect(hasApiScope(expandApiScopes(["jobs.run"]), "jobs.read")).toBe(true);
    expect(hasApiScope(parseApiScopes("jobs.read,runs.read"), "jobs.delete")).toBe(false);
  });

  it("serializes uniquely and in canonical order", () => {
    expect(serializeApiScopes(["runs.read", "jobs.write", "jobs.write"])).toBe("jobs.read,jobs.write,runs.read");
  });
});

describe("openapi catalog", () => {
  it("covers every documented path in the OpenAPI document", () => {
    const doc = buildOpenApiDoc();
    for (const endpoint of API_ENDPOINTS) {
      const path = doc.paths[endpoint.path] as Record<string, unknown> | undefined;
      expect(path, endpoint.path).toBeTruthy();
      expect(path?.[endpoint.method.toLowerCase()], `${endpoint.method} ${endpoint.path}`).toBeTruthy();
    }
  });

  it("builds a curl example with bearer auth", () => {
    const jobs = API_ENDPOINTS.find((item) => item.id === "jobs-list");
    expect(jobs).toBeTruthy();
    const curl = apiCurl("https://cron.softify.gr", jobs!);
    expect(curl).toContain("Authorization: Bearer $SOFTIFYCRON_TOKEN");
    expect(curl).toContain("https://cron.softify.gr/api/v1/jobs");
  });
});

describe("app docs", () => {
  it("documents the product surfaces and the API", () => {
    const ids = APP_DOC_SECTIONS.map((section) => section.id);
    expect(ids).toEqual(
      expect.arrayContaining(["overview", "jobs", "types", "runs", "notify", "people", "api", "hooks"]),
    );
    expect(searchDocSections("heartbeat").some((section) => section.id === "types")).toBe(true);
    expect(searchDocSections("zzzz-missing")).toEqual([]);
  });
});

describe("public serializers", () => {
  it("strips hook hashes and golden bodies from jobs", () => {
    const job = publicJob({
      id: "j1",
      tenantId: "t1",
      groupId: null,
      name: "Ping",
      description: null,
      type: "HTTP",
      tags: "",
      cronExpr: "* * * * *",
      timezone: "UTC",
      enabled: true,
      method: "GET",
      url: "https://example.com",
      headers: { Authorization: "secret" },
      body: null,
      timeoutMs: 1000,
      retryMax: 0,
      retryDelaySec: 60,
      notifyUrl: null,
      notifyEmailOn: "",
      notifyTelegramOn: "",
      notifyWebhookOn: "",
      notifySlackOn: "",
      notifyDiscordOn: "",
      notifySmsOn: "",
      hookTokenHash: "hashed",
      hookTokenPrefix: "hk_abc",
      hookHmac: "",
      telegramTemplateId: null,
      telegramNote: "",
      assigneeEmail: "",
      configLocked: false,
      authUrl: "",
      authBody: "token=1",
      extraHosts: "",
      assertFinalUrl: "",
      assertJsonSchema: "",
      goldenBody: "huge",
      flapScore: 0,
      keepResponse: false,
      responseBoard: false,
      pauseAfter: 0,
      snoozeUntil: null,
      followUpJobId: null,
      dependsOnJobId: null,
      assertStatus: 0,
      assertJsonPath: "",
      assertEquals: "",
      assertContains: "",
      slowAfterMs: 0,
      skipHolidays: false,
      skipWeekends: false,
      activeHoursStart: "",
      activeHoursEnd: "",
      notes: null,
      ackedAt: null,
      ackedBy: null,
      ackNote: null,
      eventMutes: null,
      gridViews: null,
      gridWatches: null,
      onceAt: null,
      sloFailPerDay: 0,
      consecutiveFailures: 0,
      lastStatus: null,
      lastRunAt: null,
      lastHeartbeatAt: null,
      nextRunAt: null,
      lockedUntil: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      group: null,
    });
    expect(job).not.toHaveProperty("hookTokenHash");
    expect(job).not.toHaveProperty("goldenBody");
    expect(job).not.toHaveProperty("authBody");
    expect(job.hookConfigured).toBe(true);
    expect(job.hasGoldenBody).toBe(true);
    expect(job.hasAuthBody).toBe(true);
    expect(job.headers).toEqual({ Authorization: "secret" });
  });

  it("omits run bodies unless asked", () => {
    const run = {
      id: "r1",
      jobId: "j1",
      tenantId: "t1",
      status: "SUCCESS" as const,
      trigger: "MANUAL" as const,
      startedAt: new Date(),
      finishedAt: new Date(),
      httpStatus: 200,
      durationMs: 12,
      responseBody: "hello",
      responseCharset: "utf-8",
      error: null,
      comment: null,
      dnsMs: 1,
      connectMs: 1,
      ttfbMs: 2,
      finalUrl: "https://example.com",
      silent: false,
      job: { id: "j1", name: "Ping", type: "HTTP" as const },
    };
    expect(publicRun(run).responseBody).toBeUndefined();
    expect(publicRun(run).hasBody).toBe(true);
    expect(publicRun(run, { includeBody: true }).responseBody).toBe("hello");
  });
});

describe("parseTakeSkip", () => {
  it("clamps take and skip", () => {
    const params = new URLSearchParams("take=9999&skip=-4");
    expect(parseTakeSkip(params, 100, 200)).toEqual({ take: 200, skip: 0 });
  });
});
