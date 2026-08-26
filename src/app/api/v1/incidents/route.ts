import { prisma } from "@/lib/prisma";
import { apiJson, apiOptions, parseTakeSkip } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { publicIncident } from "@/lib/api-public";

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request) {
  const auth = await requireV1(request, "jobs.read");
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const { take, skip } = parseTakeSkip(searchParams, 50, 200);
  const jobId = searchParams.get("jobId");
  const openOnly = searchParams.get("open") === "1" || searchParams.get("open") === "true";
  const incidents = await prisma.incident.findMany({
    where: {
      tenantId: auth.actor.tenantId,
      ...(jobId ? { jobId } : {}),
      ...(openOnly ? { closedAt: null } : {}),
    },
    include: { job: { select: { id: true, name: true, lastStatus: true } } },
    orderBy: { openedAt: "desc" },
    take,
    skip,
  });
  return apiJson({ incidents: incidents.map(publicIncident), take, skip });
}
