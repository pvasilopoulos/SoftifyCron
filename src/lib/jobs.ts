import { prisma } from "@/lib/prisma";
import { getNextRunAt, validateCron } from "@/lib/cron";
import { assertSafeUrl } from "@/lib/ssrf";
import type { JobInput } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function createJob(tenantId: string, input: JobInput) {
  validateCron(input.cronExpr, input.timezone);
  await assertSafeUrl(input.url);
  const nextRunAt = input.enabled
    ? getNextRunAt(input.cronExpr, input.timezone)
    : null;

  return prisma.cronJob.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description || null,
      cronExpr: input.cronExpr,
      timezone: input.timezone,
      method: input.method,
      url: input.url,
      headers: (input.headers ?? undefined) as Prisma.InputJsonValue | undefined,
      body: input.body || null,
      timeoutMs: input.timeoutMs,
      enabled: input.enabled,
      nextRunAt,
    },
  });
}

export async function updateJob(tenantId: string, jobId: string, input: JobInput) {
  validateCron(input.cronExpr, input.timezone);
  await assertSafeUrl(input.url);
  const existing = await prisma.cronJob.findFirst({
    where: { id: jobId, tenantId },
  });
  if (!existing) return null;

  const nextRunAt = input.enabled
    ? getNextRunAt(input.cronExpr, input.timezone)
    : null;

  return prisma.cronJob.update({
    where: { id: jobId },
    data: {
      name: input.name,
      description: input.description || null,
      cronExpr: input.cronExpr,
      timezone: input.timezone,
      method: input.method,
      url: input.url,
      headers: (input.headers ?? undefined) as Prisma.InputJsonValue | undefined,
      body: input.body || null,
      timeoutMs: input.timeoutMs,
      enabled: input.enabled,
      nextRunAt,
      lockedUntil: input.enabled ? existing.lockedUntil : null,
    },
  });
}

export async function getJobForTenant(tenantId: string, jobId: string) {
  return prisma.cronJob.findFirst({
    where: { id: jobId, tenantId },
  });
}

export async function listJobs(tenantId: string) {
  return prisma.cronJob.findMany({
    where: { tenantId },
    orderBy: [{ enabled: "desc" }, { nextRunAt: "asc" }, { name: "asc" }],
  });
}

export async function deleteJob(tenantId: string, jobId: string) {
  const result = await prisma.cronJob.deleteMany({
    where: { id: jobId, tenantId },
  });
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
