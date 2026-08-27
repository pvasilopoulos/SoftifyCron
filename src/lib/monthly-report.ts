import { prisma } from "@/lib/prisma";
import { incidentDurationMs } from "@/lib/incidents";
import { reportMonthRange, type ReportRow } from "@/lib/report";

export async function monthlyOpsRows(
  tenantId: string,
  opts?: { month?: string | null; jobIds?: string[] },
) {
  const { start, end, key } = reportMonthRange(opts?.month);
  if (opts?.jobIds && opts.jobIds.length === 0) {
    return { rows: [] as ReportRow[], start, end, key };
  }
  const jobs = await prisma.cronJob.findMany({
    where: {
      tenantId,
      ...(opts?.jobIds ? { id: { in: opts.jobIds } } : {}),
    },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });
  const rows: ReportRow[] = [];
  for (const job of jobs) {
    const [runs, failed, incidents] = await Promise.all([
      prisma.jobRun.count({ where: { jobId: job.id, startedAt: { gte: start, lt: end } } }),
      prisma.jobRun.count({
        where: {
          jobId: job.id,
          startedAt: { gte: start, lt: end },
          status: { in: ["FAILED", "TIMEOUT", "BLOCKED"] },
        },
      }),
      prisma.incident.findMany({
        where: { jobId: job.id, openedAt: { gte: start, lt: end } },
        select: { openedAt: true, closedAt: true },
      }),
    ]);
    rows.push({
      job: job.name,
      type: job.type,
      runs,
      failed,
      incidents: incidents.length,
      openMinutes: incidents.reduce(
        (sum, item) => sum + incidentDurationMs(item.openedAt, item.closedAt, end) / 60_000,
        0,
      ),
    });
  }
  return { rows, start, end, key };
}
