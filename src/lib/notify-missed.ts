import { prisma } from "@/lib/prisma";
import { isHeartbeatStale } from "@/lib/cron";
import { notifyJob } from "@/lib/notify";

export async function checkMissedHeartbeats(limit = 80) {
  const jobs = await prisma.cronJob.findMany({
    where: { enabled: true, type: "HEARTBEAT" },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });
  let n = 0;
  for (const job of jobs) {
    if (!isHeartbeatStale(job)) continue;
    await notifyJob(
      {
        ...job,
        lastStatus: "MISSED",
        error: "No heartbeat within the expected window",
      },
      { events: ["missed"] },
    );
    n += 1;
  }
  return n;
}

export async function recordJobHeartbeat(tenantId: string, jobId: string) {
  const job = await prisma.cronJob.findFirst({
    where: { id: jobId, tenantId, type: "HEARTBEAT" },
    select: { id: true },
  });
  if (!job) return null;
  const now = new Date();
  return prisma.cronJob.update({
    where: { id: job.id },
    data: { lastHeartbeatAt: now },
  });
}
