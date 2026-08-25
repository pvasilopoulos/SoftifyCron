import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { resolveApiToken } from "@/lib/api-tokens";
import { recordJobHeartbeat } from "@/lib/notify-missed";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

async function tenantIdFrom(request: Request) {
  const session = await getTenantSession();
  if (session && hasPermission(session, "jobs.run")) return session.tid;
  const token = await resolveApiToken(request.headers.get("authorization"));
  return token?.tenantId ?? null;
}

async function ping(request: Request, { params }: Ctx) {
  const tenantId = await tenantIdFrom(request);
  if (!tenantId) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const job = await recordJobHeartbeat(tenantId, id);
  if (!job) return jsonError("Heartbeat job not found", 404);
  return NextResponse.json({
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
