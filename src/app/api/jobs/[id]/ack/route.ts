import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { ackJob } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.run")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const job = await ackJob(session.tid, id, { name: session.name, email: session.email }, String(body.note ?? ""));
  if (!job) return jsonError("Job not found", 404);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "job.ack",
    target: id,
    meta: { note: body.note ?? "" },
  });
  return NextResponse.json({ job });
}
