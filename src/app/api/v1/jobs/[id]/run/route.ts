import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { resolveApiToken } from "@/lib/api-tokens";
import { getJobForTenant } from "@/lib/jobs";
import { executeJob } from "@/lib/runner";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

async function tenantIdFrom(request: Request) {
  const session = await getTenantSession();
  if (session && hasPermission(session, "jobs.run")) return session.tid;
  const token = await resolveApiToken(request.headers.get("authorization"));
  return token?.tenantId ?? null;
}

export async function POST(request: Request, { params }: Ctx) {
  const tenantId = await tenantIdFrom(request);
  if (!tenantId) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const job = await getJobForTenant(tenantId, id);
  if (!job) return jsonError("Job not found", 404);
  const result = await executeJob(job, "MANUAL");
  return NextResponse.json(result);
}
