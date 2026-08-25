import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { resolveApiToken } from "@/lib/api-tokens";
import { createJob, listJobs } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import type { JobType } from "@prisma/client";

async function tenantIdFrom(request: Request) {
  const session = await getTenantSession();
  if (session && hasPermission(session, "jobs.view")) return { tenantId: session.tid, canEdit: hasPermission(session, "jobs.edit") };
  const token = await resolveApiToken(request.headers.get("authorization"));
  if (token) return { tenantId: token.tenantId, canEdit: true };
  return null;
}

export async function GET(request: Request) {
  const auth = await tenantIdFrom(request);
  if (!auth) return jsonError("Unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const jobs = await listJobs(auth.tenantId, {
    q: searchParams.get("q") ?? undefined,
    type: (searchParams.get("type") as JobType | null) ?? undefined,
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const auth = await tenantIdFrom(request);
  if (!auth) return jsonError("Unauthorized", 401);
  if (!auth.canEdit) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const job = await createJob(auth.tenantId, parsed.data);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create job", 400);
  }
}
