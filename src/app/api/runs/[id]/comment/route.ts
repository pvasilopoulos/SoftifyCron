import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { commentRun } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { writeAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "runs.view")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { comment?: string };
  const run = await commentRun(session.tid, id, String(body.comment ?? ""));
  if (!run) return jsonError("Run not found", 404);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "run.comment",
    target: id,
  });
  return NextResponse.json({ run });
}
