import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { muteJobEvent } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { event?: string; hours?: unknown };
  const hours = Number(body.hours ?? 0);
  if (!body.event) return apiError("event is required", 400);
  try {
    const job = await muteJobEvent(auth.actor.tenantId, id, body.event, hours);
    if (!job) return apiError("Job not found", 404, "not_found");
    await writeAudit({
      tenantId: auth.actor.tenantId,
      actorId: auth.actor.actorId,
      action: hours > 0 ? "job.mute" : "job.unmute",
      target: id,
      meta: { via: "api", event: body.event, hours, actor: auth.actor.actorLabel },
    });
    return apiJson({ job: await loadPublicJob(auth.actor.tenantId, id) });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not mute event", 400);
  }
}
