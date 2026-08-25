import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { importJobs } from "@/lib/job-io";
import { writeAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/acl";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  try {
    const result = await importJobs(session.tid, body);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "jobs.import",
      target: session.tid,
      meta: { count: result.count },
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Import failed", 400);
  }
}
