import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { deleteJob, getJobForTenant, toggleJob, updateJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ job });
}

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    const job = await updateJob(session.tid, id, parsed.data, `${session.name} <${session.email}>`, {
      overrideLock: session.role === "OWNER" || session.platform,
    });
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update job";
    return jsonError(message, 400);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") return jsonError("enabled must be a boolean");

  const existing = await getJobForTenant(session.tid, id);
  if (!existing) return jsonError("Job not found", 404);

  const job = await toggleJob(session.tid, id, enabled);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: enabled ? "job.resume" : "job.pause",
    target: id,
  });
  return NextResponse.json({ job });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.delete")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const ok = await deleteJob(session.tid, id);
  if (!ok) return jsonError("Job not found", 404);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "job.delete",
    target: id,
  });
  return NextResponse.json({ ok: true });
}
