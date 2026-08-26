import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { deleteJobGridView, saveJobGridView } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    visible?: string[];
    freeze?: boolean;
    compact?: boolean;
    wrap?: boolean;
    pageSize?: number;
    widths?: Record<string, number>;
  };
  try {
    const job = await saveJobGridView(session.tid, id, {
      name: String(body.name ?? ""),
      visible: body.visible,
      freeze: body.freeze,
      compact: body.compact,
      wrap: body.wrap,
      pageSize: body.pageSize,
      widths: body.widths,
    });
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save view", 400);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { viewId?: string };
  if (!body.viewId) return jsonError("viewId is required", 400);
  const job = await deleteJobGridView(session.tid, id, body.viewId);
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ job });
}
