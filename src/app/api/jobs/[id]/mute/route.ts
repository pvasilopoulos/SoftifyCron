import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { muteJobEvent } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { event?: string; hours?: unknown };
  const hours = Number(body.hours ?? 0);
  if (!body.event) return jsonError("event is required", 400);
  try {
    const job = await muteJobEvent(session.tid, id, body.event, hours);
    if (!job) return jsonError("Job not found", 404);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: hours > 0 ? "job.mute" : "job.unmute",
      target: id,
      meta: { event: body.event, hours },
    });
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not mute event", 400);
  }
}
