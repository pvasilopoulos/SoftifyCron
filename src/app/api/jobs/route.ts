import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createJob, listJobs } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { canManage } from "@/lib/acl";
import type { JobType } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { searchParams } = new URL(request.url);
  const jobs = await listJobs(session.tid, {
    q: searchParams.get("q") ?? undefined,
    groupId: searchParams.get("group") ?? undefined,
    type: (searchParams.get("type") as JobType | null) ?? undefined,
    state: (searchParams.get("state") as "armed" | "paused" | "failing" | null) ?? undefined,
  });
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const job = await createJob(session.tid, parsed.data);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create job", 400);
  }
}
