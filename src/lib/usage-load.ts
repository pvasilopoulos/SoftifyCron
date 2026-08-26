import { prisma } from "./prisma";
import { deadSecretKeys } from "./dead-secrets";
import { failureHeatmap, heatmapMax, type HeatCell } from "./heatmap";
import { summarizeJobCounts, toFiniteCount } from "./usage";

const FAILING = ["FAILED", "TIMEOUT", "BLOCKED"] as const;
const SECRET_MARK = "{{SECRET:";

export async function storedBodyBytes(tenantId: string) {
  const rows = await prisma.$queryRaw<Array<{ bytes: bigint | number | null }>>`
    SELECT COALESCE(SUM(OCTET_LENGTH(responseBody)), 0) AS bytes
    FROM JobRun
    WHERE tenantId = ${tenantId} AND responseBody IS NOT NULL
  `;
  return toFiniteCount(rows[0]?.bytes);
}

export async function loadUsageCards(tenantId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const month = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const [tenant, jobGroups, runsToday, runsMonth, bodyBytes, deliveries, pushDevices] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { capJobs: true, capRunsMonth: true },
    }),
    prisma.cronJob.groupBy({
      by: ["enabled", "lastStatus"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.jobRun.count({ where: { tenantId, startedAt: { gte: startOfDay } } }),
    prisma.jobRun.count({ where: { tenantId, startedAt: { gte: month } } }),
    storedBodyBytes(tenantId),
    prisma.notifyDelivery.count({ where: { tenantId, createdAt: { gte: month } } }),
    prisma.pushSubscription.count({ where: { tenantId } }),
  ]);

  const { jobs, armed, failing } = summarizeJobCounts(
    jobGroups.map((row) => ({
      enabled: row.enabled,
      lastStatus: row.lastStatus,
      count: row._count._all,
    })),
  );

  return {
    jobs,
    armed,
    failing,
    runsToday,
    runsMonth,
    bodyBytes,
    deliveries,
    pushDevices,
    capJobs: tenant?.capJobs ?? 0,
    capRunsMonth: tenant?.capRunsMonth ?? 0,
  };
}

export async function loadUsageHeat(tenantId: string): Promise<{
  timeZone: string;
  heat: HeatCell[];
  heatMax: number;
}> {
  const heatSince = new Date();
  heatSince.setHours(0, 0, 0, 0);
  heatSince.setDate(heatSince.getDate() - 14);

  const [tenant, failRuns] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    }),
    prisma.jobRun.findMany({
      where: {
        tenantId,
        startedAt: { gte: heatSince },
        status: { in: [...FAILING] },
      },
      select: { startedAt: true, status: true },
      take: 8_000,
    }),
  ]);

  const timeZone = tenant?.timezone || "UTC";
  const heat = failureHeatmap(failRuns, timeZone);
  return { timeZone, heat, heatMax: heatmapMax(heat) };
}

export async function loadDeadSecrets(tenantId: string) {
  const [secrets, jobRows] = await Promise.all([
    prisma.secret.findMany({ where: { tenantId }, select: { key: true } }),
    prisma.cronJob.findMany({
      where: {
        tenantId,
        OR: [
          { url: { contains: SECRET_MARK } },
          { body: { contains: SECRET_MARK } },
          { authUrl: { contains: SECRET_MARK } },
          { authBody: { contains: SECRET_MARK } },
        ],
      },
      select: { name: true, url: true, body: true, headers: true, authUrl: true, authBody: true },
      take: 300,
    }),
  ]);

  return deadSecretKeys(
    jobRows.flatMap((job) => [
      job.url,
      job.body,
      job.authUrl,
      job.authBody,
      job.headers ? JSON.stringify(job.headers) : "",
    ]),
    secrets.map((item) => item.key),
  );
}
