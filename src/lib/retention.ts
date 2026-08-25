import { prisma } from "@/lib/prisma";

export async function pruneJobHistory(
  tenantId: string,
  jobId: string,
  opts: { runRetentionDays: number; bodyKeepLast: number },
) {
  if (opts.runRetentionDays > 0) {
    const cutoff = new Date(Date.now() - opts.runRetentionDays * 86_400_000);
    await prisma.jobRun.deleteMany({
      where: { tenantId, jobId, startedAt: { lt: cutoff } },
    });
  }
  if (opts.bodyKeepLast <= 0) return;
  const keep = await prisma.jobRun.findMany({
    where: { tenantId, jobId, responseBody: { not: null } },
    orderBy: { startedAt: "desc" },
    take: opts.bodyKeepLast,
    select: { id: true },
  });
  const keepIds = keep.map((run) => run.id);
  await prisma.jobRun.updateMany({
    where: {
      tenantId,
      jobId,
      responseBody: { not: null },
      ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
    },
    data: { responseBody: null, responseCharset: null },
  });
}

export async function tenantRunningCount(tenantId: string) {
  return prisma.jobRun.count({
    where: { tenantId, status: "RUNNING" },
  });
}
