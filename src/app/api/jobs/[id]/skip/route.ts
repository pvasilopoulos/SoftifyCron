import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { skipJobNextRun } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { canManage } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const { id } = await params;
  try {
    const job = await skipJobNextRun(session.tid, id);
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not skip run", 400);
  }
}
