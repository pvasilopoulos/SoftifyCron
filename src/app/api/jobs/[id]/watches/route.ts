import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { deleteJobWatch, saveJobWatch } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    column?: string;
    op?: string;
    value?: string;
  };
  try {
    const job = await saveJobWatch(session.tid, id, {
      column: String(body.column ?? ""),
      op: String(body.op ?? ""),
      value: String(body.value ?? ""),
    });
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save watch", 400);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { watchId?: string };
  if (!body.watchId) return jsonError("watchId is required", 400);
  const job = await deleteJobWatch(session.tid, id, body.watchId);
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ job });
}
