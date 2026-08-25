import { prisma } from "@/lib/prisma";

export { HEARTBEAT_STALE_MS, heartbeatStatus } from "@/lib/heartbeat-status";

export const HEARTBEAT_ID = "singleton";

export async function recordWorkerHeartbeat(jobsClaimed: number) {
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
}

export async function getWorkerHeartbeat() {
  return prisma.workerHeartbeat.findUnique({ where: { id: HEARTBEAT_ID } });
}
