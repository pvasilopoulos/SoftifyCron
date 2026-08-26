import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { skipJobNextRun } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  try {
    const job = await skipJobNextRun(auth.actor.tenantId, id);
    if (!job) return apiError("Job not found", 404, "not_found");
    await writeAudit({
      tenantId: auth.actor.tenantId,
      actorId: auth.actor.actorId,
      action: "job.skip",
      target: id,
      meta: { via: "api", actor: auth.actor.actorLabel },
    });
    return apiJson({ job: await loadPublicJob(auth.actor.tenantId, id) });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not skip run", 400);
  }
}
