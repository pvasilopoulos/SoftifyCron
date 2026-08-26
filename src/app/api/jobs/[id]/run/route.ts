import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { getJobForTenant } from "@/lib/jobs";
import { executeJob } from "@/lib/runner";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.run")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
  if (!job) return jsonError("Job not found", 404);
  const url = new URL(request.url);
  const silent = url.searchParams.get("silent") === "1" || url.searchParams.get("silent") === "true";
  const result = await executeJob(job, "MANUAL", { muteNotify: silent });
  return NextResponse.json(result);
}
