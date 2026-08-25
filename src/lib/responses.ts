import { prisma } from "@/lib/prisma";
import { parseResponseGrid, previewGrid } from "@/lib/response-grid";

export async function listResponseBoardJobs(tenantId: string) {
  return prisma.cronJob.findMany({
    where: { tenantId, responseBoard: true },
    select: {
      id: true,
      name: true,
      timezone: true,
      lastStatus: true,
      lastRunAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function listKeptResponseJobs(tenantId: string) {
  return prisma.cronJob.findMany({
    where: { tenantId, keepResponse: true },
    select: {
      id: true,
      name: true,
      timezone: true,
      responseBoard: true,
      lastStatus: true,
      group: { select: { name: true, color: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function latestBodiesByJob(tenantId: string, jobIds: string[]) {
  if (jobIds.length === 0) return [];
  const runs = await Promise.all(
    jobIds.map((jobId) =>
      prisma.jobRun.findFirst({
        where: { tenantId, jobId, responseBody: { not: null } },
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          jobId: true,
          status: true,
          httpStatus: true,
          startedAt: true,
          durationMs: true,
          responseBody: true,
          responseCharset: true,
          error: true,
        },
      }),
    ),
  );
  return runs.filter((run): run is NonNullable<typeof run> => Boolean(run));
}

export async function listJobResponseRuns(tenantId: string, jobId: string, take = 12) {
  return prisma.jobRun.findMany({
    where: { tenantId, jobId, responseBody: { not: null } },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      httpStatus: true,
      startedAt: true,
      durationMs: true,
      responseBody: true,
      responseCharset: true,
      error: true,
      trigger: true,
    },
  });
}

export async function searchResponseBodies(tenantId: string, q: string, take = 40) {
  const needle = q.trim();
  if (needle.length < 2) return [];
  return prisma.jobRun.findMany({
    where: {
      tenantId,
      responseBody: { not: null, contains: needle },
    },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      jobId: true,
      status: true,
      httpStatus: true,
      startedAt: true,
      error: true,
      job: { select: { name: true, timezone: true, responseBoard: true } },
    },
  });
}

export function catalogRow(
  job: {
    id: string;
    name: string;
    timezone: string;
    responseBoard: boolean;
    lastStatus: string | null;
    group: { name: string; color: string } | null;
  },
  run: {
    id: string;
    status: string;
    httpStatus: number | null;
    startedAt: Date;
    durationMs: number | null;
    responseBody: string | null;
    responseCharset: string | null;
    error: string | null;
  } | undefined,
) {
  const grid = parseResponseGrid(run?.responseBody);
  return {
    jobId: job.id,
    name: job.name,
    timezone: job.timezone,
    responseBoard: job.responseBoard,
    lastStatus: job.lastStatus,
    groupName: job.group?.name ?? "Ungrouped",
    groupColor: job.group?.color ?? "#8b93a7",
    runId: run?.id ?? null,
    runStatus: run?.status ?? null,
    httpStatus: run?.httpStatus ?? null,
    startedAt: run?.startedAt?.toISOString() ?? null,
    charset: run?.responseCharset ?? null,
    error: run?.error ?? null,
    preview: previewGrid(grid),
  };
}
