import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { scheduleOnce } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { at?: string | null };
  const at = body.at ? new Date(body.at) : null;
  if (body.at && Number.isNaN(at?.getTime())) return jsonError("Invalid time", 400);
  try {
    const job = await scheduleOnce(session.tid, id, at);
    if (!job) return jsonError("Job not found", 404);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: at ? "job.once" : "job.once.clear",
      target: id,
      meta: { at: at?.toISOString() ?? null },
    });
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not schedule once-off", 400);
  }
}
