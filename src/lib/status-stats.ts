import { prisma } from "@/lib/prisma";

const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;

export async function statusStats(tenantId: string, days = 90) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [total, success, lastOutage] = await Promise.all([
    prisma.jobRun.count({ where: { tenantId, startedAt: { gte: since } } }),
    prisma.jobRun.count({
      where: { tenantId, startedAt: { gte: since }, status: "SUCCESS" },
    }),
    prisma.jobRun.findFirst({
      where: { tenantId, status: { in: [...FAILING] }, startedAt: { gte: since } },
      orderBy: { startedAt: "desc" },
      select: {
        startedAt: true,
        status: true,
        error: true,
        job: { select: { name: true } },
      },
    }),
  ]);
  const uptime = total === 0 ? null : Math.round((success / total) * 1000) / 10;
  return { days, total, success, uptime, lastOutage };
}

export async function jobStatusStats(tenantId: string, jobIds: string[], days = 90) {
  if (jobIds.length === 0) return new Map<string, { total: number; success: number; uptime: number | null }>();
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.jobRun.groupBy({
    by: ["jobId", "status"],
    where: { tenantId, jobId: { in: jobIds }, startedAt: { gte: since } },
    _count: { _all: true },
  });
  const map = new Map<string, { total: number; success: number; uptime: number | null }>();
  for (const id of jobIds) map.set(id, { total: 0, success: 0, uptime: null });
  for (const row of rows) {
    const current = map.get(row.jobId) ?? { total: 0, success: 0, uptime: null };
    current.total += row._count._all;
    if (row.status === "SUCCESS") current.success += row._count._all;
    map.set(row.jobId, current);
  }
  for (const [id, row] of map) {
    row.uptime = row.total === 0 ? null : Math.round((row.success / row.total) * 1000) / 10;
    map.set(id, row);
  }
  return map;
}
