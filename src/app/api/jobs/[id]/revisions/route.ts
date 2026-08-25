import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { listJobRevisions, restoreRevision } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const revisions = await listJobRevisions(session.tid, id);
  if (!revisions) return jsonError("Job not found", 404);
  return NextResponse.json({
    revisions: revisions.map((row) => {
      const snap = row.snapshot && typeof row.snapshot === "object" ? (row.snapshot as { name?: unknown }) : {};
      return {
        id: row.id,
        actor: row.actor,
        createdAt: row.createdAt.toISOString(),
        name: typeof snap.name === "string" ? snap.name : "",
      };
    }),
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { revisionId?: string };
  if (!body.revisionId) return jsonError("revisionId is required", 400);
  try {
    const job = await restoreRevision(
      session.tid,
      id,
      body.revisionId,
      `${session.name} <${session.email}>`,
    );
    if (!job) return jsonError("Revision not found", 404);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "job.restore",
      target: id,
      meta: { revisionId: body.revisionId },
    });
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not restore revision", 400);
  }
}
