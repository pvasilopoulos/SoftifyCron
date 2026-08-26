import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { monthlyOpsCsv, type ReportRow } from "@/lib/report";
import { incidentDurationMs } from "@/lib/incidents";

export async function GET(request: Request) {
  const session = await getTenantSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month");
  const now = new Date();
  const start = month && /^\d{4}-\d{2}$/.test(month)
    ? new Date(`${month}-01T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const jobs = await prisma.cronJob.findMany({
    where: { tenantId: session.tid },
    select: { id: true, name: true, type: true },
  });
  const rows: ReportRow[] = [];
  for (const job of jobs) {
    const [runs, failed, incidents] = await Promise.all([
      prisma.jobRun.count({ where: { jobId: job.id, startedAt: { gte: start, lt: end } } }),
      prisma.jobRun.count({
        where: { jobId: job.id, startedAt: { gte: start, lt: end }, status: { in: ["FAILED", "TIMEOUT", "BLOCKED"] } },
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
      openMinutes: incidents.reduce((sum, item) => sum + incidentDurationMs(item.openedAt, item.closedAt, end) / 60_000, 0),
    });
  }
  const csv = monthlyOpsCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ops-${start.toISOString().slice(0, 7)}.csv"`,
    },
  });
}
