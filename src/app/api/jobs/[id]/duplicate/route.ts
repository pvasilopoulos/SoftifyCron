import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { duplicateJob, getJobForTenant } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { canManage } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const { id } = await params;
  const existing = await getJobForTenant(session.tid, id);
  if (!existing) return jsonError("Job not found", 404);
  const job = await duplicateJob(session.tid, id);
  return NextResponse.json({ job }, { status: 201 });
}
