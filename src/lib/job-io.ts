import { createJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { jobInputSchema } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export async function exportJobs(tenantId: string) {
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId },
    include: { group: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return {
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    jobs: jobs.map((job) => ({
      name: job.name,
      description: job.description,
      groupName: job.group?.name ?? null,
      type: job.type,
      tags: job.tags,
      cronExpr: job.cronExpr,
      timezone: job.timezone,
      method: job.method,
      url: job.url,
      headers: job.headers,
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
      notes: job.notes,
      sloFailPerDay: job.sloFailPerDay,
      enabled: false,
    })),
  };
}

export async function importJobs(tenantId: string, payload: unknown) {
  const parsed = payload as { jobs?: unknown };
  if (!parsed || !Array.isArray(parsed.jobs)) {
    throw new Error("Backup must include a jobs array");
  }
  let count = 0;
  for (const row of parsed.jobs.slice(0, 200)) {
    const item = jobInputSchema.safeParse({
      ...(typeof row === "object" && row ? row : {}),
      enabled: false,
    });
    if (!item.success) continue;
    await createJob(tenantId, item.data);
    count += 1;
  }
  return { count };
}

export async function exportTenantBackup(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      slug: true,
      timezone: true,
      notifyEmail: true,
      defaultNotifyEmailOn: true,
      defaultNotifyTelegramOn: true,
      defaultNotifyWebhookOn: true,
      defaultNotifySlackOn: true,
    },
  });
  if (!tenant) throw new Error("Workspace not found");
  const jobs = await exportJobs(tenantId);
  const groups = await prisma.jobGroup.findMany({
    where: { tenantId },
    select: { name: true, slug: true, color: true },
    orderBy: { name: "asc" },
  });
  return {
    version: 1 as const,
    kind: "softifycron-tenant" as const,
    exportedAt: new Date().toISOString(),
    tenant,
    groups,
    jobs: jobs.jobs,
  };
}

export function headersRecord(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}
