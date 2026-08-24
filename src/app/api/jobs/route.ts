import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createJob, listJobs } from "@/lib/jobs";
import { jobInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const jobs = await listJobs(session.tid);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  try {
    const job = await createJob(session.tid, parsed.data);
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create job";
    return jsonError(message, 400);
  }
}
