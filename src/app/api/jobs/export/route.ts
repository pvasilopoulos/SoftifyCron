import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { exportJobs } from "@/lib/job-io";
import { hasPermission } from "@/lib/acl";
import { jsonError } from "@/lib/http";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.view")) return jsonError("Forbidden", 403);
  const payload = await exportJobs(session.tid);
  return NextResponse.json(payload);
}
