import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { moveJobToTenant } from "@/lib/jobs";
import { writeAudit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  if (!session.tid) return jsonError("Open a workspace first", 400);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
  if (!tenantId) return jsonError("Select a tenant", 400);
  try {
    const job = await moveJobToTenant(id, session.tid, tenantId);
    if (!job) return jsonError("Job not found", 404);
    await writeAudit({
      tenantId,
      actorId: session.sub,
      action: "job.move",
      target: id,
      meta: { from: session.tid, to: tenantId },
    });
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Move failed", 400);
  }
}
