import { apiError, apiJson, apiOptions, apiZodError } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { publicJob } from "@/lib/api-public";
import { deleteJob, getJobForTenant, toggleJob, updateJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.read");
  if (auth.error) return auth.error;
  const { id } = await params;
  const job = await getJobForTenant(auth.actor.tenantId, id);
  if (!job) return apiError("Job not found", 404, "not_found");
  return apiJson({ job: publicJob(job) });
}

export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return apiZodError(parsed.error);
  try {
    const job = await updateJob(auth.actor.tenantId, id, parsed.data, auth.actor.actorLabel, {
      overrideLock: auth.actor.overrideLock,
    });
    if (!job) return apiError("Job not found", 404, "not_found");
    await writeAudit({
      tenantId: auth.actor.tenantId,
      actorId: auth.actor.actorId,
      action: "job.update",
      target: id,
      meta: { via: "api", actor: auth.actor.actorLabel },
    });
    return apiJson({ job: (await loadPublicJob(auth.actor.tenantId, id)) ?? publicJob(job) });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not update job", 400);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") return apiError("enabled must be a boolean", 400);
  const existing = await getJobForTenant(auth.actor.tenantId, id);
  if (!existing) return apiError("Job not found", 404, "not_found");
  await toggleJob(auth.actor.tenantId, id, body.enabled);
  await writeAudit({
    tenantId: auth.actor.tenantId,
    actorId: auth.actor.actorId,
    action: body.enabled ? "job.resume" : "job.pause",
    target: id,
    meta: { via: "api", actor: auth.actor.actorLabel },
  });
  return apiJson({ job: await loadPublicJob(auth.actor.tenantId, id) });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.delete");
  if (auth.error) return auth.error;
  const { id } = await params;
  const ok = await deleteJob(auth.actor.tenantId, id);
  if (!ok) return apiError("Job not found", 404, "not_found");
  await writeAudit({
    tenantId: auth.actor.tenantId,
    actorId: auth.actor.actorId,
    action: "job.delete",
    target: id,
    meta: { via: "api", actor: auth.actor.actorLabel },
  });
  return apiJson({ ok: true });
}
