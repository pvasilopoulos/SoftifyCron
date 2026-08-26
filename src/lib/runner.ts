import type { CronJob, Prisma, RunTrigger } from "@prisma/client";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { assertSafeUrl } from "@/lib/ssrf";
import { listSecretValues, resolveSecrets } from "@/lib/secrets";
import { notifyJob } from "@/lib/notify";
import { eventsForRun } from "@/lib/notify-events";
import { recordWorkerHeartbeat } from "@/lib/heartbeat";
import { decodeHttpBody } from "@/lib/decode";
import { fitMysqlLongText, readBodyBytes } from "@/lib/response-body";
import { checkAssertions } from "@/lib/assert-response";
import { isOverdueSlot, nextAllowedFire, scheduleBlockReason } from "@/lib/schedule-policy";
import { pruneJobHistory, tenantRunningCount } from "@/lib/retention";
import { maintAction, maintFromRow } from "@/lib/maintenance";
import { applyEventMutes } from "@/lib/event-mutes";
import { evalGridWatches, parseGridWatches, watchSummary } from "@/lib/grid-watch";
import { failsInWindow } from "@/lib/spark-data";
import { runProbe } from "@/lib/probe-run";
import { isProbeType, parseProbeTarget, skipsHttpStatusAssert } from "@/lib/probes";
import { parseHostList } from "@/lib/hosts-list";
import { checkLiteSchema, parseLiteSchema } from "@/lib/json-schema";
import { rdapUrl, parseRdapExpiry } from "@/lib/rdap";
import { redactSecrets } from "@/lib/redact";
import { flapScore } from "@/lib/flap";
import { capHit } from "@/lib/caps";
import { isFailingStatus } from "@/lib/incidents";
import { emitApiRunEvent } from "@/lib/api-events";

type RequestResult = {
  httpStatus: number | null;
  responseBody: string | null;
  encoding: string | null;
  ok: boolean;
  dnsMs?: number | null;
  connectMs?: number | null;
  ttfbMs?: number | null;
  finalUrl?: string | null;
};

function needsResponseBody(job: CronJob) {
  return Boolean(
    job.assertContains?.trim() ||
      job.assertJsonPath?.trim() ||
      job.assertJsonSchema?.trim() ||
      job.keepResponse ||
      parseGridWatches(job.gridWatches).length,
  );
}

function headerRecord(value: Prisma.JsonValue | null): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

async function safeFetch(rawUrl: string, init: RequestInit, timeoutMs: number) {
  let current = await assertSafeUrl(rawUrl);
  let last = current.toString();
  const ttfbStart = Date.now();
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    last = current.toString();
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: last, ttfbMs: Date.now() - ttfbStart };
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }
    return { response, finalUrl: last, ttfbMs: Date.now() - ttfbStart };
  }
  throw new Error("Too many redirects");
}

function cookieHeader(response: Response) {
  const raw =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  return raw
    .map((item) => item.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ");
}

async function dnsLookupMs(url: string) {
  try {
    const host = new URL(url).hostname;
    const started = Date.now();
    await lookup(host);
    return Date.now() - started;
  } catch {
    return null;
  }
}

async function runDomain(job: CronJob): Promise<RequestResult> {
  const target = parseProbeTarget(job.url, "TLS");
  const url = rdapUrl(target.host);
  await assertSafeUrl(url);
  const dnsMs = await dnsLookupMs(url);
  const ttfbStart = Date.now();
  const response = await fetch(url, {
    headers: { "user-agent": "SoftifyCron/1.0", accept: "application/rdap+json, application/json" },
    signal: AbortSignal.timeout(job.timeoutMs),
    redirect: "follow",
  });
  const ttfbMs = Date.now() - ttfbStart;
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    return {
      httpStatus: null,
      responseBody: text.slice(0, 4000),
      encoding: "utf-8",
      ok: false,
      dnsMs,
      ttfbMs,
      finalUrl: url,
    };
  }
  const parsed = parseRdapExpiry(payload);
  const minDays = job.assertStatus > 0 ? job.assertStatus : 14;
  const ok = parsed.days != null && parsed.days >= minDays;
  const body = parsed.expiresAt
    ? `domain ${target.host} expires ${parsed.expiresAt.toISOString()} (${parsed.days} days)`
    : `domain ${target.host} expiry unknown`;
  return {
    httpStatus: null,
    responseBody: body,
    encoding: "utf-8",
    ok,
    dnsMs,
    ttfbMs,
    finalUrl: url,
  };
}

async function performRequest(job: CronJob): Promise<RequestResult> {
  if (job.type === "DOMAIN") return runDomain(job);
  if (isProbeType(job.type)) {
    if (job.type === "TLS") {
      const extras = parseHostList(job.extraHosts);
      if (extras.length) {
        const parts: string[] = [];
        let ok = true;
        const connectMs = 0;
        for (const host of [job.url, ...extras]) {
          const result = await runProbe({ ...job, url: host });
          parts.push(`${host}: ${result.responseBody ?? (result.ok ? "ok" : "fail")}`);
          ok = ok && result.ok;
        }
        return { ...{ httpStatus: null, encoding: "utf-8", ok, responseBody: parts.join("\n"), connectMs } };
      }
    }
    return runProbe(job);
  }
  const rawHeaders = headerRecord(job.headers);
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    headers.set(key, await resolveSecrets(job.tenantId, value));
  }
  if (!headers.has("user-agent")) {
    headers.set("user-agent", "SoftifyCron/1.0");
  }
  if (!headers.has("accept-charset")) {
    headers.set("accept-charset", "utf-8, windows-1253, iso-8859-7, windows-1252;q=0.8");
  }
  if (job.authUrl.trim()) {
    const authUrl = await resolveSecrets(job.tenantId, job.authUrl);
    const authBody = await resolveSecrets(job.tenantId, job.authBody);
    const authHeaders = new Headers({ "user-agent": "SoftifyCron/1.0" });
    if (authBody && !authHeaders.has("content-type")) authHeaders.set("content-type", "application/json");
    const auth = await safeFetch(
      authUrl,
      { method: "POST", headers: authHeaders, body: authBody || undefined },
      job.timeoutMs,
    );
    const cookie = cookieHeader(auth.response);
    if (cookie) headers.set("cookie", cookie);
    try {
      await auth.response.body?.cancel();
    } catch {
      /* ignore */
    }
  }
  const method = job.type === "HEARTBEAT" ? "GET" : job.method;
  const canHaveBody = method !== "GET" && method !== "DELETE";
  const body = canHaveBody ? await resolveSecrets(job.tenantId, job.body) : undefined;
  if (canHaveBody && body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const url = await resolveSecrets(job.tenantId, job.url);
  const dnsMs = await dnsLookupMs(url);
  const fetched = await safeFetch(
    url,
    { method, headers, body: canHaveBody ? body || undefined : undefined },
    job.timeoutMs,
  );
  const response = fetched.response;
  if (!job.keepResponse && !needsResponseBody(job)) {
    try {
      await response.body?.cancel();
    } catch {
      /* ignore */
    }
    return {
      httpStatus: response.status,
      responseBody: null,
      encoding: null,
      ok: response.ok,
      dnsMs,
      ttfbMs: fetched.ttfbMs,
      finalUrl: fetched.finalUrl,
    };
  }
  const buffer = await readBodyBytes(response);
  const decoded = decodeHttpBody(buffer, response.headers.get("content-type"));
  return {
    httpStatus: response.status,
    responseBody: fitMysqlLongText(decoded.text),
    encoding: decoded.encoding,
    ok: response.ok,
    dnsMs,
    ttfbMs: fetched.ttfbMs,
    finalUrl: fetched.finalUrl,
  };
}

export async function previewJob(job: CronJob) {
  const started = Date.now();
  try {
    const result = await performRequest({ ...job, keepResponse: true });
    return {
      ok: result.ok,
      httpStatus: result.httpStatus,
      responseBody: (result.responseBody ?? "").slice(0, 20_000),
      encoding: result.encoding,
      durationMs: Date.now() - started,
      error: result.ok ? null : `HTTP ${result.httpStatus}`,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: null as number | null,
      responseBody: null as string | null,
      encoding: null as string | null,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : "Preview failed",
    };
  }
}

export async function executeJobById(jobId: string, trigger: RunTrigger, opts?: { muteNotify?: boolean }) {
  const job = await prisma.cronJob.findUnique({ where: { id: jobId } });
  if (!job) return null;
  return executeJob(job, trigger, opts);
}

export async function executeJob(job: CronJob, trigger: RunTrigger, opts?: { muteNotify?: boolean }) {
  const startedAt = new Date();
  const run = await prisma.jobRun.create({
    data: {
      jobId: job.id,
      tenantId: job.tenantId,
      status: "RUNNING",
      trigger,
      startedAt,
    },
  });

  let status: "SUCCESS" | "FAILED" | "TIMEOUT" | "BLOCKED" = "FAILED";
  let httpStatus: number | null = null;
  let responseBody: string | null = null;
  let responseCharset: string | null = null;
  let error: string | null = null;
  let dnsMs: number | null = null;
  let connectMs: number | null = null;
  let ttfbMs: number | null = null;
  let finalUrl: string | null = null;

  try {
    const result = await performRequest(job);
    httpStatus = result.httpStatus;
    responseBody = result.responseBody;
    responseCharset = result.encoding;
    dnsMs = result.dnsMs ?? null;
    connectMs = result.connectMs ?? null;
    ttfbMs = result.ttfbMs ?? null;
    finalUrl = result.finalUrl ?? null;
    status = result.ok ? "SUCCESS" : "FAILED";
    if (!result.ok) {
      error =
        result.httpStatus != null
          ? `HTTP ${result.httpStatus}`
          : result.responseBody?.slice(0, 240) || "Probe failed";
    }
    const assertion = checkAssertions(
      result.responseBody,
      result.httpStatus,
      skipsHttpStatusAssert(job.type) ? { ...job, assertStatus: 0 } : job,
    );
    if (assertion) {
      status = "FAILED";
      error = `Assertion: ${assertion}`;
    }
    const wantFinal = job.assertFinalUrl.trim();
    if (wantFinal && finalUrl && !finalUrl.includes(wantFinal) && finalUrl !== wantFinal) {
      status = "FAILED";
      error = `Assertion: final URL ${finalUrl} did not match ${wantFinal}`;
    }
    if (job.assertJsonSchema.trim()) {
      try {
        const schema = parseLiteSchema(job.assertJsonSchema);
        const schemaError = checkLiteSchema(result.responseBody, schema);
        if (schemaError) {
          status = "FAILED";
          error = `Assertion: ${schemaError}`;
        }
      } catch (err) {
        status = "FAILED";
        error = `Assertion: ${err instanceof Error ? err.message : "invalid JSON schema"}`;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      status = "TIMEOUT";
      error = `Timed out after ${job.timeoutMs}ms`;
    } else if (
      message.includes("not allowed") ||
      message.includes("private address") ||
      message.includes("Invalid URL") ||
      message.includes("Only HTTP") ||
      message.includes("Unknown secret")
    ) {
      status = "BLOCKED";
      error = message;
    } else {
      status = "FAILED";
      error = message;
    }
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const failed = status !== "SUCCESS";
  if (responseBody) {
    try {
      const secrets = await listSecretValues(job.tenantId);
      responseBody = redactSecrets(
        responseBody,
        secrets.map((item) => item.value).filter(Boolean),
      );
    } catch {
      /* ignore */
    }
  }
  const consecutiveFailures = failed ? job.consecutiveFailures + 1 : 0;
  const shouldRetry =
    failed &&
    trigger !== "MANUAL" &&
    trigger !== "ONCE" &&
    job.enabled &&
    job.retryMax > 0 &&
    consecutiveFailures <= job.retryMax;

  const tenant = await prisma.tenant.findUnique({ where: { id: job.tenantId } });
  const previousDurations = await prisma.jobRun.findMany({
    where: { jobId: job.id, status: "SUCCESS", durationMs: { not: null }, id: { not: run.id } },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: { durationMs: true },
  });
  const samples = previousDurations
    .map((item) => item.durationMs)
    .filter((item): item is number => item != null)
    .sort((left, right) => left - right);
  const autoSlow =
    samples.length >= 3
      ? Math.max(samples[Math.floor(samples.length / 2)]! * 3, samples[Math.floor(samples.length / 2)]! + 2000)
      : null;
  const slowLimit = job.slowAfterMs > 0 ? job.slowAfterMs : autoSlow;
  const slow = Boolean(slowLimit && durationMs >= slowLimit);
  const escalate =
    failed &&
    !shouldRetry &&
    (tenant?.escalateAfter ?? 3) > 0 &&
    consecutiveFailures >= (tenant?.escalateAfter ?? 3);

  await prisma.jobRun.update({
    where: { id: run.id },
    data: {
      status,
      httpStatus,
      responseBody: job.keepResponse ? responseBody : null,
      responseCharset: job.keepResponse ? responseCharset : null,
      error,
      finishedAt,
      durationMs,
      dnsMs,
      connectMs,
      ttfbMs,
      finalUrl,
      silent: Boolean(opts?.muteNotify),
    },
  });

  const autoPause =
    failed &&
    !shouldRetry &&
    job.pauseAfter > 0 &&
    consecutiveFailures >= job.pauseAfter;
  const stillArmed = job.enabled && !autoPause;
  const lateMs =
    trigger === "MANUAL" || trigger === "ONCE" || !job.nextRunAt
      ? 0
      : startedAt.getTime() - job.nextRunAt.getTime();

  let nextRunAt = job.nextRunAt;
  if ((trigger === "MANUAL" || trigger === "ONCE") && stillArmed) {
    nextRunAt = job.nextRunAt;
  } else if (shouldRetry) {
    nextRunAt = new Date(Date.now() + job.retryDelaySec * 1000);
  } else if (stillArmed) {
    nextRunAt = nextAllowedFire(job.cronExpr, job, Boolean(tenant?.skipGreekHolidays), finishedAt);
  } else {
    nextRunAt = null;
  }

  const watchHits = evalGridWatches(responseBody, job.gridWatches);
  const sloFails =
    job.sloFailPerDay > 0 ? await failsInWindow(job.id, 24) : 0;
  const slo = job.sloFailPerDay > 0 && sloFails >= job.sloFailPerDay;
  const notifyError = [error, watchHits.length ? `Watch: ${watchSummary(watchHits)}` : null]
    .filter(Boolean)
    .join(" · ");

  const recent = await prisma.jobRun.findMany({
    where: { jobId: job.id, startedAt: { gte: new Date(Date.now() - 86_400_000) } },
    orderBy: { startedAt: "asc" },
    select: { status: true },
  });
  const nextFlap = flapScore(recent.map((item) => item.status));

  await prisma.cronJob.update({
    where: { id: job.id },
    data: {
      lastRunAt: startedAt,
      lastStatus: status,
      consecutiveFailures,
      flapScore: nextFlap,
      enabled: stillArmed,
      nextRunAt,
      lockedUntil: null,
      ...(trigger === "ONCE" ? { onceAt: null } : {}),
      ...(status === "SUCCESS" ? { ackedAt: null, ackedBy: null, ackNote: null } : {}),
      ...(status === "SUCCESS" && job.type === "HEARTBEAT" ? { lastHeartbeatAt: finishedAt } : {}),
    },
  });

  try {
    const open = await prisma.incident.findFirst({
      where: { jobId: job.id, closedAt: null },
      orderBy: { openedAt: "desc" },
    });
    if (isFailingStatus(status) && !open) {
      await prisma.incident.create({
        data: {
          tenantId: job.tenantId,
          jobId: job.id,
          openedByRunId: run.id,
          assigneeEmail: job.assigneeEmail,
        },
      });
    } else if (!isFailingStatus(status) && open) {
      await prisma.incident.update({
        where: { id: open.id },
        data: { closedAt: finishedAt, closedByRunId: run.id },
      });
    }
  } catch (error) {
    console.error("[worker] incident sync failed", job.id, error);
  }

  if (!shouldRetry) {
    const rawEvents = eventsForRun({
      status,
      previousFailures: job.consecutiveFailures,
      paused: autoPause,
      lateMs,
      slow,
      escalate,
      watch: watchHits.length > 0,
      slo,
    });
    const events = applyEventMutes(rawEvents, job.eventMutes);
    await notifyJob(
      {
        ...job,
        consecutiveFailures,
        lastStatus: status,
        error: slow && !notifyError ? `Ran in ${durationMs}ms` : notifyError || error,
        httpStatus,
        paused: autoPause,
        previousFailures: job.consecutiveFailures,
      },
      {
        runId: run.id,
        lateMs,
        events,
        silent: Boolean(opts?.muteNotify),
      },
    );
  }

  if (
    status === "SUCCESS" &&
    (trigger === "SCHEDULE" || trigger === "RETRY") &&
    job.followUpJobId &&
    job.followUpJobId !== job.id
  ) {
    try {
      const follow = await prisma.cronJob.findFirst({
        where: { id: job.followUpJobId, tenantId: job.tenantId },
      });
      if (follow) await executeJob(follow, "MANUAL");
    } catch (error) {
      console.error("[worker] follow-up job failed", job.followUpJobId, error);
    }
  }

  if (tenant) {
    try {
      await pruneJobHistory(job.tenantId, job.id, {
        runRetentionDays: tenant.runRetentionDays,
        bodyKeepLast: tenant.bodyKeepLast,
      });
    } catch (error) {
      console.error("[worker] retention failed", job.id, error);
    }
  }

  if (!shouldRetry) {
    void emitApiRunEvent(job.tenantId, {
      jobId: job.id,
      jobName: job.name,
      jobType: job.type,
      runId: run.id,
      status,
      trigger,
      httpStatus,
      durationMs,
      error: notifyError || error,
    }).catch((error) => console.error("[api-event] emit failed", job.id, error));
  }

  return { runId: run.id, status, retried: shouldRetry };
}

export async function claimAndRunDueJobs(limit = 25) {
  let ran = 0;
  try {
    ran += await runOnceJobs(limit);
    ran += await runScheduledJobs(Math.max(0, limit - ran));
    return ran;
  } finally {
    try {
      await recordWorkerHeartbeat(ran);
    } catch (error) {
      console.error("[worker] heartbeat failed", error);
    }
  }
}

async function runOnceJobs(limit: number) {
  if (limit <= 0) return 0;
  const now = new Date();
  const due = await prisma.cronJob.findMany({
    where: {
      onceAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    include: { group: true },
    orderBy: { onceAt: "asc" },
    take: limit,
  });
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: [...new Set(due.map((job) => job.tenantId))] } },
  });
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  let ran = 0;
  for (const job of due) {
    const tenant = tenantById.get(job.tenantId);
    const maint = maintAction(now, job.timezone, maintFromRow(tenant), maintFromRow(job.group));
    const running = await tenantRunningCount(job.tenantId);
    if (running >= (tenant?.maxConcurrent ?? 4)) continue;
    const lockUntil = new Date(now.getTime() + job.timeoutMs + 10_000);
    const claimed = await prisma.cronJob.updateMany({
      where: {
        id: job.id,
        onceAt: job.onceAt,
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      data: { lockedUntil: lockUntil },
    });
    if (claimed.count !== 1) continue;
    await executeJob(job, "ONCE", { muteNotify: maint.mute });
    ran += 1;
  }
  return ran;
}

async function runScheduledJobs(limit: number) {
  if (limit <= 0) return 0;
  let ran = 0;
  const now = new Date();
  const due = await prisma.cronJob.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    include: { group: true },
    orderBy: { nextRunAt: "asc" },
    take: limit,
  });
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: [...new Set(due.map((job) => job.tenantId))] } },
  });
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));

  for (const job of due) {
    const tenant = tenantById.get(job.tenantId);
    const holidays = Boolean(tenant?.skipGreekHolidays);
    const maint = maintAction(now, job.timezone, maintFromRow(tenant), maintFromRow(job.group));
    const blocked = scheduleBlockReason({ ...job, maintSkip: maint.skip }, holidays, now);
    const skipOverdue = tenant && !tenant.catchUpMissed && isOverdueSlot(job.cronExpr, job.timezone, job.nextRunAt, now);
    if (blocked || skipOverdue) {
      await prisma.cronJob.updateMany({
        where: { id: job.id, nextRunAt: job.nextRunAt },
        data: {
          nextRunAt: nextAllowedFire(job.cronExpr, { ...job, maintSkip: maint.skip }, holidays, now),
          lockedUntil: null,
        },
      });
      continue;
    }
    if (job.dependsOnJobId) {
      const parent = await prisma.cronJob.findFirst({
        where: { id: job.dependsOnJobId, tenantId: job.tenantId },
        select: { lastStatus: true },
      });
      if (parent?.lastStatus !== "SUCCESS") {
        await prisma.cronJob.updateMany({
          where: { id: job.id, nextRunAt: job.nextRunAt },
          data: {
            nextRunAt: nextAllowedFire(job.cronExpr, job, holidays, now),
            lockedUntil: null,
          },
        });
        continue;
      }
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const runsMonth = await prisma.jobRun.count({
      where: { tenantId: job.tenantId, startedAt: { gte: monthStart } },
    });
    if (capHit(runsMonth, tenant?.capRunsMonth ?? 0)) {
      await prisma.cronJob.updateMany({
        where: { id: job.id, nextRunAt: job.nextRunAt },
        data: {
          nextRunAt: nextAllowedFire(job.cronExpr, { ...job, maintSkip: maint.skip }, holidays, now),
          lockedUntil: null,
        },
      });
      continue;
    }
    const running = await tenantRunningCount(job.tenantId);
    if (running >= (tenant?.maxConcurrent ?? 4)) continue;

    const lockUntil = new Date(now.getTime() + job.timeoutMs + 10_000);
    const claimed = await prisma.cronJob.updateMany({
      where: {
        id: job.id,
        enabled: true,
        nextRunAt: job.nextRunAt,
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
      },
      data: { lockedUntil: lockUntil },
    });
    if (claimed.count !== 1) continue;
    const isRetry = job.consecutiveFailures > 0;
    await executeJob(job, isRetry ? "RETRY" : "SCHEDULE", { muteNotify: maint.mute });
    ran += 1;
  }
  return ran;
}
