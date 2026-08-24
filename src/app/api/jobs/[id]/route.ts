import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { deleteJob, getJobForTenant, toggleJob, updateJob } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ job });
}

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    const job = await updateJob(session.tid, id, parsed.data);
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update job";
    return jsonError(message, 400);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") return jsonError("enabled must be a boolean");

  const existing = await getJobForTenant(session.tid, id);
  if (!existing) return jsonError("Job not found", 404);

  const job = await toggleJob(session.tid, id, enabled);
  return NextResponse.json({ job });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const ok = await deleteJob(session.tid, id);
  if (!ok) return jsonError("Job not found", 404);
  return NextResponse.json({ ok: true });
}
