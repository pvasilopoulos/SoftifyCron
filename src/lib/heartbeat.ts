import { prisma } from "@/lib/prisma";

export { HEARTBEAT_STALE_MS, heartbeatStatus } from "@/lib/heartbeat-status";

export const HEARTBEAT_ID = "singleton";

export async function recordWorkerHeartbeat(jobsClaimed: number) {
  try {
    await prisma.workerHeartbeat.upsert({
      where: { id: HEARTBEAT_ID },
      create: {
        id: HEARTBEAT_ID,
        tickedAt: new Date(),
        hostname: process.env.HOSTNAME ?? null,
        jobsClaimed,
      },
      update: {
        tickedAt: new Date(),
        hostname: process.env.HOSTNAME ?? null,
        jobsClaimed,
      },
    });
  } catch (error) {
    console.error("[softifycron] worker heartbeat write failed", error);
  }
}

export async function getWorkerHeartbeat() {
  try {
    return await prisma.workerHeartbeat.findUnique({ where: { id: HEARTBEAT_ID } });
  } catch (error) {
    console.error("[softifycron] worker heartbeat read failed", error);
    return null;
  }
}
