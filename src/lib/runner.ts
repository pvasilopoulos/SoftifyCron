import type { CronJob, Prisma, RunTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getNextRunAt } from "@/lib/cron";
import { assertSafeUrl } from "@/lib/ssrf";
import { resolveSecrets } from "@/lib/secrets";
import { notifyFailure } from "@/lib/notify";

const MAX_BODY = 32_768;

function truncate(text: string, max = MAX_BODY) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… truncated`;
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
  for (let hop = 0; hop < 5; hop += 1) {
    const response = await fetch(current, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error("Too many redirects");
}

async function performRequest(job: CronJob) {
  const rawHeaders = headerRecord(job.headers);
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    headers.set(key, await resolveSecrets(job.tenantId, value));
  }
  if (!headers.has("user-agent")) {
    headers.set("user-agent", "SoftifyCron/1.0");
  }
  const method = job.type === "HEARTBEAT" ? "GET" : job.method;
  const canHaveBody = method !== "GET" && method !== "DELETE";
  const body = canHaveBody
    ? await resolveSecrets(job.tenantId, job.body)
    : undefined;
  if (canHaveBody && body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const url = await resolveSecrets(job.tenantId, job.url);
  const response = await safeFetch(
    url,
    { method, headers, body: canHaveBody ? body || undefined : undefined },
    job.timeoutMs,
  );
  const raw = await response.text();
  return {
    httpStatus: response.status,
    responseBody: truncate(raw),
    ok: response.ok,
  };
}

export async function executeJobById(jobId: string, trigger: RunTrigger) {
  const job = await prisma.cronJob.findUnique({ where: { id: jobId } });
  if (!job) return null;
  return executeJob(job, trigger);
}

export async function executeJob(job: CronJob, trigger: RunTrigger) {
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
  let error: string | null = null;

  try {
    const result = await performRequest(job);
    httpStatus = result.httpStatus;
    responseBody = result.responseBody;
    status = result.ok ? "SUCCESS" : "FAILED";
    if (!result.ok) error = `HTTP ${result.httpStatus}`;
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
  const consecutiveFailures = failed ? job.consecutiveFailures + 1 : 0;
  const shouldRetry =
    failed &&
    trigger !== "MANUAL" &&
    job.enabled &&
    job.retryMax > 0 &&
    consecutiveFailures <= job.retryMax;

  await prisma.jobRun.update({
    where: { id: run.id },
    data: {
      status,
      httpStatus,
      responseBody: job.keepResponse ? responseBody : null,
      error,
      finishedAt,
      durationMs,
    },
  });

  let nextRunAt = job.nextRunAt;
  if (trigger === "MANUAL") {
    nextRunAt = job.nextRunAt;
  } else if (shouldRetry) {
    nextRunAt = new Date(Date.now() + job.retryDelaySec * 1000);
  } else if (job.enabled) {
    nextRunAt = getNextRunAt(job.cronExpr, job.timezone, finishedAt);
  } else {
    nextRunAt = null;
  }

  await prisma.cronJob.update({
    where: { id: job.id },
    data: {
      lastRunAt: startedAt,
      lastStatus: status,
      consecutiveFailures,
      nextRunAt,
      lockedUntil: null,
    },
  });

  if (failed && !shouldRetry && job.notifyUrl) {
    await notifyFailure({
      ...job,
      consecutiveFailures,
      lastStatus: status,
      error,
    });
  }

  return { runId: run.id, status, retried: shouldRetry };
}

export async function claimAndRunDueJobs(limit = 25) {
  const now = new Date();
  const due = await prisma.cronJob.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: now },
      OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }],
    },
    orderBy: { nextRunAt: "asc" },
    take: limit,
  });

  let ran = 0;
  for (const job of due) {
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
    await executeJob(job, isRetry ? "RETRY" : "SCHEDULE");
    ran += 1;
  }
  return ran;
}
