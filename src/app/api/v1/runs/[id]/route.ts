import { prisma } from "@/lib/prisma";
import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { publicRun } from "@/lib/api-public";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "runs.read");
  if (auth.error) return auth.error;
  const { id } = await params;
  const includeBody = new URL(request.url).searchParams.get("include") === "body";
  const run = await prisma.jobRun.findFirst({
    where: { id, tenantId: auth.actor.tenantId },
    include: { job: { select: { id: true, name: true, type: true } } },
  });
  if (!run) return apiError("Run not found", 404, "not_found");
  return apiJson({ run: publicRun(run, { includeBody }) });
}
