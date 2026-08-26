import { prisma } from "@/lib/prisma";
import { apiJson, apiOptions, parseTakeSkip } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { publicRun } from "@/lib/api-public";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request) {
  const auth = await requireV1(request, "runs.read");
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const { take, skip } = parseTakeSkip(searchParams, 50, 200);
  const statuses = ["PENDING", "RUNNING", "SUCCESS", "FAILED", "TIMEOUT", "BLOCKED"] as const;
  const statusFilter = statuses.find((value) => value === status);

  const runs = await prisma.jobRun.findMany({
    where: {
      tenantId: auth.actor.tenantId,
      ...(jobId ? { jobId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [{ error: { contains: q } }, { job: { name: { contains: q } } }],
          }
        : {}),
    },
    include: { job: { select: { id: true, name: true, type: true } } },
    orderBy: { startedAt: "desc" },
    take,
    skip,
  });

  return apiJson({ runs: runs.map((run) => publicRun(run)), take, skip });
}
