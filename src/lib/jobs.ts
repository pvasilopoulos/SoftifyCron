import { prisma } from "@/lib/prisma";
import { getNextRunAt, skipNextFire, validateCron } from "@/lib/cron";
import { assertSafeUrl } from "@/lib/ssrf";
import { resolveGroupId } from "@/lib/groups";
import { tenantNotifyDefaults } from "@/lib/tenant-notify";
import { nextAllowedFire } from "@/lib/schedule-policy";
import type { JobInput } from "@/lib/validators";
import type { JobType, Prisma, RunStatus } from "@prisma/client";

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
  return input;
}

export async function createJob(tenantId: string, input: JobInput) {
  const data = applyTypeDefaults(input);
  validateCron(data.cronExpr, data.timezone);
  await assertSafeUrl(data.url);
  if (data.notifyUrl) await assertSafeUrl(data.notifyUrl);
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
    },
  });
}

export async function updateJob(tenantId: string, jobId: string, input: JobInput) {
  const data = applyTypeDefaults(input);
  validateCron(data.cronExpr, data.timezone);
  await assertSafeUrl(data.url);
  if (data.notifyUrl) await assertSafeUrl(data.notifyUrl);
  const existing = await prisma.cronJob.findFirst({ where: { id: jobId, tenantId } });
  if (!existing) return null;
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
      enabled: data.enabled,
      nextRunAt,
      lockedUntil: data.enabled ? existing.lockedUntil : null,
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

export async function listJobOptions(tenantId: string) {
  return prisma.cronJob.findMany({
    where: { tenantId },
    select: { id: true, name: true },
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
