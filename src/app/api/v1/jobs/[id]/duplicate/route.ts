import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { duplicateJob, getJobForTenant } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const existing = await getJobForTenant(auth.actor.tenantId, id);
  if (!existing) return apiError("Job not found", 404, "not_found");
  const job = await duplicateJob(auth.actor.tenantId, id);
  if (!job) return apiError("Job not found", 404, "not_found");
  await writeAudit({
    tenantId: auth.actor.tenantId,
    actorId: auth.actor.actorId,
    action: "job.duplicate",
    target: job.id,
    meta: { via: "api", from: id, actor: auth.actor.actorLabel },
  });
  return apiJson({ job: await loadPublicJob(auth.actor.tenantId, job.id) }, { status: 201 });
}
