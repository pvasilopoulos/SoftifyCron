import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { snoozeJob } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const ALLOWED = new Set([0, 1, 2, 8, 24]);

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.write");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { hours?: unknown };
  const hours = body.hours == null || body.hours === "" ? 0 : Number(body.hours);
  if (!ALLOWED.has(hours)) return apiError("Snooze for 1, 2, 8, or 24 hours, or 0 to clear", 400);
  try {
    const job = await snoozeJob(auth.actor.tenantId, id, hours || null);
    if (!job) return apiError("Job not found", 404, "not_found");
    await writeAudit({
      tenantId: auth.actor.tenantId,
      actorId: auth.actor.actorId,
      action: hours ? "job.snooze" : "job.unsnooze",
      target: id,
      meta: { via: "api", hours, actor: auth.actor.actorLabel },
    });
    return apiJson({ job: await loadPublicJob(auth.actor.tenantId, id) });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Could not snooze job", 400);
  }
}
