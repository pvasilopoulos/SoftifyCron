import { prisma } from "@/lib/prisma";
import { localIsoDate } from "@/lib/holidays-gr";
import { emptySpark, type SparkDay } from "./sparkline";

const FAILING = new Set(["FAILED", "TIMEOUT", "BLOCKED"]);

export async function weekSparks(
  tenantId: string,
  jobIds: string[],
  days = 7,
  timeZone = "Europe/Athens",
) {
  const map = new Map<string, SparkDay[]>();
  for (const id of jobIds) map.set(id, emptySpark(days));
  if (jobIds.length === 0) return map;
  const since = new Date(Date.now() - days * 86_400_000);
  const runs = await prisma.jobRun.findMany({
    where: { tenantId, jobId: { in: jobIds }, startedAt: { gte: since } },
    select: { jobId: true, status: true, startedAt: true },
  });
  const today = localIsoDate(new Date(), timeZone);
  const [year, month, day] = today.split("-").map(Number);
  const todayUtc = Date.UTC(year!, (month ?? 1) - 1, day ?? 1);
  for (const run of runs) {
    const iso = localIsoDate(run.startedAt, timeZone);
    const [y, m, d] = iso.split("-").map(Number);
    const offset = Math.round((todayUtc - Date.UTC(y!, (m ?? 1) - 1, d ?? 1)) / 86_400_000);
    const index = days - 1 - offset;
    const row = map.get(run.jobId);
    if (!row || index < 0 || index >= days) continue;
    if (FAILING.has(run.status)) row[index]!.bad += 1;
    else if (run.status === "SUCCESS") row[index]!.ok += 1;
  }
  return map;
}

export async function failsInWindow(jobId: string, hours = 24) {
  const since = new Date(Date.now() - hours * 3_600_000);
  return prisma.jobRun.count({
    where: {
      jobId,
      startedAt: { gte: since },
      status: { in: ["FAILED", "TIMEOUT", "BLOCKED"] },
    },
  });
}
