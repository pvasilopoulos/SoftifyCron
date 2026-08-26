import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { loadPublicJob } from "@/lib/api-job";
import { ackJob } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.run");
  if (auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const job = await ackJob(
    auth.actor.tenantId,
    id,
    { name: auth.actor.actorLabel, email: auth.actor.kind },
    String(body.note ?? ""),
  );
  if (!job) return apiError("Job not found", 404, "not_found");
  await writeAudit({
    tenantId: auth.actor.tenantId,
    actorId: auth.actor.actorId,
    action: "job.ack",
    target: id,
    meta: { via: "api", note: body.note ?? "", actor: auth.actor.actorLabel },
  });
  return apiJson({ job: await loadPublicJob(auth.actor.tenantId, id) });
}
