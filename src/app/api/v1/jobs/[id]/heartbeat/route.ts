import { apiError, apiJson, apiOptions } from "@/lib/api-http";
import { requireV1 } from "@/lib/api-guard";
import { recordJobHeartbeat } from "@/lib/notify-missed";

type Ctx = { params: Promise<{ id: string }> };

export function OPTIONS() {
  return apiOptions();
}

async function ping(request: Request, { params }: Ctx) {
  const auth = await requireV1(request, "jobs.run");
  if (auth.error) return auth.error;
  const { id } = await params;
  const job = await recordJobHeartbeat(auth.actor.tenantId, id);
  if (!job) return apiError("Heartbeat job not found", 404, "not_found");
  return apiJson({
    ok: true,
    jobId: job.id,
    lastHeartbeatAt: job.lastHeartbeatAt,
  });
}

export async function GET(request: Request, ctx: Ctx) {
  return ping(request, ctx);
}

export async function POST(request: Request, ctx: Ctx) {
  return ping(request, ctx);
}
