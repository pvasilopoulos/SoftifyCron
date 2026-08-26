import { prisma } from "@/lib/prisma";
import { getNextRunAt, skipNextFire, validateCron } from "@/lib/cron";
import { assertSafeUrl } from "@/lib/ssrf";
import { assertJobTarget, isProbeType } from "@/lib/probes";
import { resolveGroupId } from "@/lib/groups";
import { tenantNotifyDefaults } from "@/lib/tenant-notify";
import { nextAllowedFire } from "@/lib/schedule-policy";
import { setEventMute } from "@/lib/event-mutes";
import { NOTIFY_EVENTS } from "@/lib/notify-events";
import { parseGridViews, type GridView } from "@/lib/grid-views";
import { parseGridWatches, type GridWatch } from "@/lib/grid-watch";
import { jobInputSchema, type JobInput } from "@/lib/validators";
import type { CronJob, JobType, Prisma, RunStatus } from "@prisma/client";
import { capHit } from "@/lib/caps";
import { parseLiteSchema } from "@/lib/json-schema";
import { parseHookHmac } from "@/lib/hook-hmac";

export type { GridView };
export { parseGridViews };
export type { GridWatch };
export { parseGridWatches };

async function resolvePeerJobId(
  tenantId: string,
  raw: string | null | undefined,
  selfId?: string,
) {
  const id = raw?.trim() || "";
  if (!id) return null;
  if (selfId && id === selfId) throw new Error("A job cannot follow or depend on itself");
  const found = await prisma.cronJob.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  return found?.id ?? null;
}

export type JobFilters = {
  q?: string;
  groupId?: string | "none";
  type?: JobType;
  state?: "armed" | "paused" | "failing";
};

function applyTypeDefaults(input: JobInput): JobInput {
  if (input.type === "HEARTBEAT") {
    return { ...input, method: "GET", body: null };
  }
  if (input.type === "WEBHOOK") {
    return { ...input, method: input.method === "GET" ? "POST" : input.method };
  }
  if (isProbeType(input.type) || input.type === "DOMAIN") {
    return { ...input, method: "GET", body: null };
  }
  return input;
}

function extraJobFields(data: JobInput) {
  if (data.assertJsonSchema?.trim()) parseLiteSchema(data.assertJsonSchema);
  return {
    assigneeEmail: data.assigneeEmail?.trim() ?? "",
    configLocked: Boolean(data.configLocked),
    authUrl: data.authUrl?.trim() ?? "",
    authBody: data.authBody ?? "",
    extraHosts: data.extraHosts ?? "",
    assertFinalUrl: data.assertFinalUrl?.trim() ?? "",
    assertJsonSchema: data.assertJsonSchema ?? "",
    hookHmac: parseHookHmac(data.hookHmac),
  };
}

function configChanged(existing: CronJob, data: JobInput) {
  const headers = JSON.stringify(existing.headers ?? null);
  const nextHeaders = JSON.stringify(data.headers ?? null);
  return (
    existing.url !== data.url ||
    existing.cronExpr !== data.cronExpr ||
    existing.type !== data.type ||
    existing.method !== data.method ||
    existing.body !== (data.body || null) ||
    headers !== nextHeaders ||
    existing.authUrl !== (data.authUrl?.trim() ?? "") ||
    existing.authBody !== (data.authBody ?? "")
  );
}

export async function createJob(tenantId: string, input: JobInput) {
  const data = applyTypeDefaults(input);
  validateCron(data.cronExpr, data.timezone);
  await assertJobTarget(data.type, data.url);
  if (data.notifyUrl) await assertSafeUrl(data.notifyUrl);
  if (data.authUrl?.trim()) await assertSafeUrl(data.authUrl.trim());
  const extra = extraJobFields(data);
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { capJobs: true } });
  const jobCount = await prisma.cronJob.count({ where: { tenantId } });
  if (capHit(jobCount, tenant?.capJobs ?? 0)) {
    throw new Error("This workspace has reached its job cap");
  }
  const groupId = await resolveGroupId(tenantId, data);
  const [followUpJobId, dependsOnJobId, defaults] = await Promise.all([
    resolvePeerJobId(tenantId, data.followUpJobId),
    resolvePeerJobId(tenantId, data.dependsOnJobId),
    tenantNotifyDefaults(tenantId),
  ]);
  const nextRunAt = data.enabled ? getNextRunAt(data.cronExpr, data.timezone) : null;
  const keepResponse =
    data.keepResponse ||
    data.responseBoard ||
    Boolean(data.assertContains?.trim() || data.assertJsonPath?.trim());
  return prisma.cronJob.create({
    data: {
      tenantId,
      groupId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      tags: data.tags ?? "",
      cronExpr: data.cronExpr,
      timezone: data.timezone,
      method: data.method,
      url: data.url,
      headers: (data.headers ?? undefined) as Prisma.InputJsonValue | undefined,
      body: data.body || null,
      timeoutMs: data.timeoutMs,
      retryMax: data.retryMax,
      retryDelaySec: data.retryDelaySec,
      notifyUrl: data.notifyUrl || null,
      notifyEmailOn: data.notifyEmailOn ?? defaults.notifyEmailOn,
      notifyTelegramOn: data.notifyTelegramOn ?? defaults.notifyTelegramOn,
      notifyWebhookOn: data.notifyWebhookOn ?? defaults.notifyWebhookOn,
      notifySlackOn: data.notifySlackOn ?? defaults.notifySlackOn,
      notifyDiscordOn: data.notifyDiscordOn ?? defaults.notifyDiscordOn,
      notifySmsOn: data.notifySmsOn ?? defaults.notifySmsOn,
      keepResponse,
      responseBoard: data.responseBoard,
      pauseAfter: data.pauseAfter,
      enabled: data.enabled,
      nextRunAt,
      followUpJobId,
      dependsOnJobId,
      assertStatus: data.assertStatus,
      assertJsonPath: data.assertJsonPath ?? "",
      assertEquals: data.assertEquals ?? "",
      assertContains: data.assertContains ?? "",
      slowAfterMs: data.slowAfterMs,
      skipHolidays: data.skipHolidays,
      skipWeekends: data.skipWeekends,
      activeHoursStart: data.activeHoursStart ?? "",
      activeHoursEnd: data.activeHoursEnd ?? "",
      notes: data.notes?.trim() || null,
      sloFailPerDay: data.sloFailPerDay,
      ...extra,
    },
  });
}

export async function updateJob(
  tenantId: string,
  jobId: string,
  input: JobInput,
  actor = "system",
  opts?: { overrideLock?: boolean },
) {
  const data = applyTypeDefaults(input);
  validateCron(data.cronExpr, data.timezone);
  await assertJobTarget(data.type, data.url);
  if (data.notifyUrl) await assertSafeUrl(data.notifyUrl);
  if (data.authUrl?.trim()) await assertSafeUrl(data.authUrl.trim());
  const existing = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!existing) return null;
  const extra = extraJobFields(data);
  if (existing.configLocked && !opts?.overrideLock && configChanged(existing, data)) {
    throw new Error("This job is locked. Only an owner can change the target or schedule.");
  }
  if (!opts?.overrideLock) extra.configLocked = existing.configLocked;
  await writeJobRevision(existing, actor);
  const groupId = await resolveGroupId(tenantId, data);
  const [followUpJobId, dependsOnJobId] = await Promise.all([
    resolvePeerJobId(tenantId, data.followUpJobId, jobId),
    resolvePeerJobId(tenantId, data.dependsOnJobId, jobId),
  ]);
  const nextRunAt = data.enabled ? getNextRunAt(data.cronExpr, data.timezone) : null;
  const keepResponse =
    data.keepResponse ||
    data.responseBoard ||
    Boolean(data.assertContains?.trim() || data.assertJsonPath?.trim());
  return prisma.cronJob.update({
    where: { id: jobId },
    data: {
      groupId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      tags: data.tags ?? "",
      cronExpr: data.cronExpr,
      timezone: data.timezone,
      method: data.method,
      url: data.url,
      headers: (data.headers ?? undefined) as Prisma.InputJsonValue | undefined,
      body: data.body || null,
      timeoutMs: data.timeoutMs,
      retryMax: data.retryMax,
      retryDelaySec: data.retryDelaySec,
      notifyUrl: data.notifyUrl || null,
      notifyEmailOn: data.notifyEmailOn ?? existing.notifyEmailOn,
      notifyTelegramOn: data.notifyTelegramOn ?? existing.notifyTelegramOn,
      notifyWebhookOn: data.notifyWebhookOn ?? existing.notifyWebhookOn,
      notifySlackOn: data.notifySlackOn ?? existing.notifySlackOn,
      notifyDiscordOn: data.notifyDiscordOn ?? existing.notifyDiscordOn,
      notifySmsOn: data.notifySmsOn ?? existing.notifySmsOn,
      keepResponse,
      responseBoard: data.responseBoard,
      pauseAfter: data.pauseAfter,
      followUpJobId,
      dependsOnJobId,
      assertStatus: data.assertStatus,
      assertJsonPath: data.assertJsonPath ?? "",
      assertEquals: data.assertEquals ?? "",
      assertContains: data.assertContains ?? "",
      slowAfterMs: data.slowAfterMs,
      skipHolidays: data.skipHolidays,
      skipWeekends: data.skipWeekends,
      activeHoursStart: data.activeHoursStart ?? "",
      activeHoursEnd: data.activeHoursEnd ?? "",
      notes: data.notes?.trim() || null,
      sloFailPerDay: data.sloFailPerDay,
      enabled: data.enabled,
      nextRunAt,
      lockedUntil: data.enabled ? existing.lockedUntil : null,
      ...extra,
    },
  });
}

export async function getLatestRun(tenantId: string, jobId: string) {
  return prisma.jobRun.findFirst({
    where: { tenantId, jobId },
    orderBy: { startedAt: "desc" },
  });
}

export async function getJobForTenant(tenantId: string, jobId: string) {
  return prisma.cronJob.findFirst({
    where: { id: jobId, tenantId },
    include: { group: true },
  });
}

export async function listJobs(tenantId: string, filters: JobFilters = {}) {
  const failing: RunStatus[] = ["FAILED", "TIMEOUT", "BLOCKED"];
  const q = filters.q?.trim();
  return prisma.cronJob.findMany({
    where: {
      tenantId,
      ...(filters.groupId === "none"
        ? { groupId: null }
        : filters.groupId
          ? { groupId: filters.groupId }
          : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.state === "armed" ? { enabled: true } : {}),
      ...(filters.state === "paused" ? { enabled: false } : {}),
      ...(filters.state === "failing" ? { lastStatus: { in: failing } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { url: { contains: q } },
              { tags: { contains: q } },
              { cronExpr: { contains: q } },
            ],
          }
        : {}),
    },
    include: { group: true },
    orderBy: [{ enabled: "desc" }, { nextRunAt: "asc" }, { name: "asc" }],
  });
}

export async function deleteJob(tenantId: string, jobId: string) {
  const result = await prisma.cronJob.deleteMany({ where: { id: jobId, tenantId } });
  return result.count > 0;
}

export async function toggleJob(tenantId: string, jobId: string, enabled: boolean) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  return prisma.cronJob.update({
    where: { id: jobId },
    data: {
      enabled,
      nextRunAt: enabled ? getNextRunAt(job.cronExpr, job.timezone) : null,
      lockedUntil: enabled ? job.lockedUntil : null,
    },
  });
}

export async function duplicateJob(tenantId: string, jobId: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  return prisma.cronJob.create({
    data: {
      tenantId,
      groupId: job.groupId,
      name: `${job.name} copy`,
      description: job.description,
      type: job.type,
      tags: job.tags,
      cronExpr: job.cronExpr,
      timezone: job.timezone,
      enabled: false,
      method: job.method,
      url: job.url,
      headers: job.headers ?? undefined,
      body: job.body,
      timeoutMs: job.timeoutMs,
      retryMax: job.retryMax,
      retryDelaySec: job.retryDelaySec,
      notifyUrl: job.notifyUrl,
      notifyEmailOn: job.notifyEmailOn,
      notifyTelegramOn: job.notifyTelegramOn,
      notifyWebhookOn: job.notifyWebhookOn,
      notifySlackOn: job.notifySlackOn,
      notifyDiscordOn: job.notifyDiscordOn,
      notifySmsOn: job.notifySmsOn,
      keepResponse: job.keepResponse,
      responseBoard: job.responseBoard,
      pauseAfter: job.pauseAfter,
      followUpJobId: job.followUpJobId,
      dependsOnJobId: job.dependsOnJobId,
      assertStatus: job.assertStatus,
      assertJsonPath: job.assertJsonPath,
      assertEquals: job.assertEquals,
      assertContains: job.assertContains,
      slowAfterMs: job.slowAfterMs,
      skipHolidays: job.skipHolidays,
      skipWeekends: job.skipWeekends,
      activeHoursStart: job.activeHoursStart,
      activeHoursEnd: job.activeHoursEnd,
      notes: job.notes,
      sloFailPerDay: job.sloFailPerDay,
      gridWatches: job.gridWatches ?? undefined,
      assigneeEmail: job.assigneeEmail,
      configLocked: false,
      authUrl: job.authUrl,
      authBody: job.authBody,
      extraHosts: job.extraHosts,
      assertFinalUrl: job.assertFinalUrl,
      assertJsonSchema: job.assertJsonSchema,
      hookHmac: job.hookHmac,
      nextRunAt: null,
    },
  });
}

export async function bulkJobs(
  tenantId: string,
  action: "pause" | "resume" | "delete" | "move" | "run",
  ids: string[],
  groupId?: string | null,
) {
  const unique = [...new Set(ids)].slice(0, 100);
  if (unique.length === 0) return { count: 0 };
  const existing = await prisma.cronJob.findMany({
    where: { tenantId, id: { in: unique } },
  });
  const found = existing.map((job) => job.id);
  if (action === "delete") {
    const result = await prisma.cronJob.deleteMany({
      where: { tenantId, id: { in: found } },
    });
    return { count: result.count };
  }
  if (action === "pause" || action === "resume") {
    const enabled = action === "resume";
    let count = 0;
    for (const job of existing) {
      await toggleJob(tenantId, job.id, enabled);
      count += 1;
    }
    return { count };
  }
  if (action === "move") {
    if (groupId) {
      const group = await prisma.jobGroup.findFirst({
        where: { id: groupId, tenantId },
      });
      if (!group) throw new Error("Group not found");
    }
    const result = await prisma.cronJob.updateMany({
      where: { tenantId, id: { in: found } },
      data: { groupId: groupId || null },
    });
    return { count: result.count };
  }
  return { count: 0, ids: found };
}

export async function snoozeJob(tenantId: string, jobId: string, hours: number | null) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { skipGreekHolidays: true },
  });
  const snoozeUntil = hours && hours > 0 ? new Date(Date.now() + hours * 3600_000) : null;
  return prisma.cronJob.update({
    where: { id: jobId },
    data: {
      snoozeUntil,
      lockedUntil: null,
      nextRunAt: job.enabled
        ? nextAllowedFire(job.cronExpr, { ...job, snoozeUntil }, Boolean(tenant?.skipGreekHolidays))
        : null,
    },
  });
}

export async function ackJob(
  tenantId: string,
  jobId: string,
  actor: { name: string; email: string },
  note: string,
) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  return prisma.cronJob.update({
    where: { id: jobId },
    data: {
      ackedAt: new Date(),
      ackedBy: `${actor.name} <${actor.email}>`.slice(0, 190),
      ackNote: note.trim().slice(0, 500) || null,
    },
  });
}

export async function muteJobEvent(tenantId: string, jobId: string, event: string, hours: number) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  if (!NOTIFY_EVENTS.includes(event as (typeof NOTIFY_EVENTS)[number])) {
    throw new Error("Unknown event");
  }
  const eventMutes = setEventMute(job.eventMutes, event as (typeof NOTIFY_EVENTS)[number], hours);
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { eventMutes: eventMutes as Prisma.InputJsonValue },
  });
}

export async function commentRun(tenantId: string, runId: string, comment: string) {
  const run = await prisma.jobRun.findFirst({ where: { id: runId, tenantId } });
  if (!run) return null;
  return prisma.jobRun.update({
    where: { id: runId },
    data: { comment: comment.trim().slice(0, 500) || null },
  });
}

export async function saveJobGridView(tenantId: string, jobId: string, view: Omit<GridView, "id">) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const views = parseGridViews(job.gridViews);
  const next: GridView = { ...view, id: `v_${Date.now().toString(36)}`, name: view.name.trim().slice(0, 40) };
  if (!next.name) throw new Error("Name the view");
  const saved = [...views.filter((item) => item.name !== next.name), next].slice(-12);
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { gridViews: saved as Prisma.InputJsonValue },
  });
}

export async function deleteJobGridView(tenantId: string, jobId: string, viewId: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const views = parseGridViews(job.gridViews).filter((item) => item.id !== viewId);
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { gridViews: views as Prisma.InputJsonValue },
  });
}

export async function listJobOptions(tenantId: string) {
  return prisma.cronJob.findMany({
    where: { tenantId },
    select: { id: true, name: true, followUpJobId: true, dependsOnJobId: true },
    orderBy: { name: "asc" },
  });
}

export async function skipJobNextRun(tenantId: string, jobId: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  if (!job.enabled) throw new Error("Paused jobs have no upcoming fire to skip");
  return prisma.cronJob.update({
    where: { id: job.id },
    data: {
      nextRunAt: skipNextFire(job.cronExpr, job.timezone, job.nextRunAt),
      lockedUntil: null,
    },
  });
}

export async function moveJobToTenant(jobId: string, fromTenantId: string, toTenantId: string) {
  if (fromTenantId === toTenantId) return getJobForTenant(fromTenantId, jobId);
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId: fromTenantId } });
  if (!job) return null;
  const dest = await prisma.tenant.findUnique({ where: { id: toTenantId }, select: { id: true } });
  if (!dest) throw new Error("Destination tenant not found");
  await prisma.$transaction([
    prisma.cronJob.update({
      where: { id: jobId },
      data: { tenantId: toTenantId, groupId: null },
    }),
    prisma.jobRun.updateMany({
      where: { jobId },
      data: { tenantId: toTenantId },
    }),
    prisma.notifyDelivery.updateMany({
      where: { jobId },
      data: { tenantId: toTenantId },
    }),
  ]);
  return prisma.cronJob.findUnique({ where: { id: jobId } });
}

function actorLabel(actor: string) {
  return actor.trim().slice(0, 190) || "system";
}

export function jobSnapshot(job: CronJob) {
  const headers =
    job.headers && typeof job.headers === "object" && !Array.isArray(job.headers)
      ? (job.headers as Record<string, string>)
      : undefined;
  return {
    name: job.name,
    description: job.description,
    groupId: job.groupId,
    type: job.type,
    tags: job.tags,
    cronExpr: job.cronExpr,
    timezone: job.timezone,
    method: job.method,
    url: job.url,
    headers,
    body: job.body,
    timeoutMs: job.timeoutMs,
    retryMax: job.retryMax,
    retryDelaySec: job.retryDelaySec,
    notifyUrl: job.notifyUrl,
    notifyEmailOn: job.notifyEmailOn,
    notifyTelegramOn: job.notifyTelegramOn,
    notifyWebhookOn: job.notifyWebhookOn,
    notifySlackOn: job.notifySlackOn,
    notifyDiscordOn: job.notifyDiscordOn,
    notifySmsOn: job.notifySmsOn,
    keepResponse: job.keepResponse,
    responseBoard: job.responseBoard,
    pauseAfter: job.pauseAfter,
    enabled: job.enabled,
    followUpJobId: job.followUpJobId,
    dependsOnJobId: job.dependsOnJobId,
    assertStatus: job.assertStatus,
    assertJsonPath: job.assertJsonPath,
    assertEquals: job.assertEquals,
    assertContains: job.assertContains,
    slowAfterMs: job.slowAfterMs,
    skipHolidays: job.skipHolidays,
    skipWeekends: job.skipWeekends,
    activeHoursStart: job.activeHoursStart,
    activeHoursEnd: job.activeHoursEnd,
    notes: job.notes ?? "",
    sloFailPerDay: job.sloFailPerDay,
    assigneeEmail: job.assigneeEmail,
    configLocked: job.configLocked,
    authUrl: job.authUrl,
    authBody: job.authBody,
    extraHosts: job.extraHosts,
    assertFinalUrl: job.assertFinalUrl,
    assertJsonSchema: job.assertJsonSchema,
    hookHmac: job.hookHmac,
  };
}

export async function writeJobRevision(job: CronJob, actor: string) {
  await prisma.jobRevision.create({
    data: {
      jobId: job.id,
      tenantId: job.tenantId,
      actor: actorLabel(actor),
      snapshot: jobSnapshot(job) as Prisma.InputJsonValue,
    },
  });
  const extra = await prisma.jobRevision.findMany({
    where: { jobId: job.id },
    orderBy: { createdAt: "desc" },
    skip: 30,
    select: { id: true },
  });
  if (extra.length) {
    await prisma.jobRevision.deleteMany({ where: { id: { in: extra.map((row) => row.id) } } });
  }
}

export async function listJobRevisions(tenantId: string, jobId: string, take = 20) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId }, select: { id: true } });
  if (!job) return null;
  return prisma.jobRevision.findMany({
    where: { jobId, tenantId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, actor: true, snapshot: true, createdAt: true },
  });
}

export async function restoreRevision(
  tenantId: string,
  jobId: string,
  revisionId: string,
  actor: string,
  opts?: { overrideLock?: boolean },
) {
  const revision = await prisma.jobRevision.findFirst({
    where: { id: revisionId, jobId, tenantId },
  });
  if (!revision) return null;
  const parsed = jobInputSchema.safeParse(revision.snapshot);
  if (!parsed.success) throw new Error("This revision cannot be restored");
  return updateJob(tenantId, jobId, parsed.data, actor, opts);
}

export async function scheduleOnce(tenantId: string, jobId: string, at: Date | null) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  if (at && at.getTime() < Date.now() - 60_000) throw new Error("Pick a time in the future");
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { onceAt: at },
  });
}

export async function saveJobWatch(
  tenantId: string,
  jobId: string,
  input: { column: string; op: string; value?: string },
) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const parsed = parseGridWatches([{ id: "tmp", column: input.column, op: input.op, value: input.value ?? "" }]);
  if (parsed.length === 0) throw new Error("Invalid watch rule");
  const watch: GridWatch = { ...parsed[0]!, id: `w_${Date.now().toString(36)}` };
  const saved = [...parseGridWatches(job.gridWatches), watch].slice(-20);
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { gridWatches: saved as Prisma.InputJsonValue },
  });
}

export async function deleteJobWatch(tenantId: string, jobId: string, watchId: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const watches = parseGridWatches(job.gridWatches).filter((item) => item.id !== watchId);
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { gridWatches: watches as Prisma.InputJsonValue },
  });
}

export async function assignJob(tenantId: string, jobId: string, email: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  const assigneeEmail = email.trim().slice(0, 190);
  await prisma.incident.updateMany({
    where: { jobId, tenantId, closedAt: null },
    data: { assigneeEmail },
  });
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { assigneeEmail },
  });
}

export async function pinGoldenBody(tenantId: string, jobId: string, body?: string | null) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  let goldenBody = body ?? "";
  if (!goldenBody) {
    const run = await prisma.jobRun.findFirst({
      where: { jobId, tenantId, status: "SUCCESS", responseBody: { not: null } },
      orderBy: { startedAt: "desc" },
      select: { responseBody: true },
    });
    goldenBody = run?.responseBody ?? "";
  }
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { goldenBody },
  });
}

export async function saveJobLibrary(tenantId: string, jobId: string, name: string, description = "") {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!job) return null;
  return prisma.jobLibrary.create({
    data: {
      tenantId,
      name: name.trim().slice(0, 80) || job.name,
      description: description.trim().slice(0, 240),
      snapshot: jobSnapshot(job) as Prisma.InputJsonValue,
    },
  });
}

export async function listJobLibrary(tenantId: string) {
  return prisma.jobLibrary.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function deleteJobLibrary(tenantId: string, id: string) {
  const result = await prisma.jobLibrary.deleteMany({ where: { id, tenantId } });
  return result.count > 0;
}

export async function rotateJobHook(tenantId: string, jobId: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId }, select: { id: true } });
  if (!job) return null;
  const { newHookToken } = await import("./inbound");
  const token = newHookToken();
  await prisma.cronJob.update({
    where: { id: jobId },
    data: { hookTokenHash: token.hash, hookTokenPrefix: token.prefix },
  });
  return token;
}

export async function clearJobHook(tenantId: string, jobId: string) {
  const job = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId }, select: { id: true } });
  if (!job) return null;
  return prisma.cronJob.update({
    where: { id: jobId },
    data: { hookTokenHash: null, hookTokenPrefix: null },
  });
}
