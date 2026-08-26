import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { scheduleOnce } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { at?: string | null };
  const at = body.at ? new Date(body.at) : null;
  if (body.at && Number.isNaN(at?.getTime())) return apiError("Invalid time", 400);
  try {
    const job = await scheduleOnce(auth.actor.tenantId, id, at);
    if (!job) return apiError("Job not found", 404, "not_found");
    await writeAudit({
      tenantId: auth.actor.tenantId,
      actorId: auth.actor.actorId,
      action: at ? "job.once" : "job.once.clear",
      target: id,
      meta: { via: "api", at: at?.toISOString() ?? null, actor: auth.actor.actorLabel },
    });
    return apiJson({ job: await loadPublicJob(auth.actor.tenantId, id) });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not schedule once-off", 400);
  }
}
