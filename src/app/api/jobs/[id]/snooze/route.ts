import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { snoozeJob } from "@/lib/jobs";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set([0, 1, 2, 8, 24]);

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { hours?: unknown };
  const hours = body.hours == null || body.hours === "" ? 0 : Number(body.hours);
  if (!ALLOWED.has(hours)) return jsonError("Snooze for 1, 2, 8, or 24 hours, or 0 to clear", 400);
  try {
    const job = await snoozeJob(session.tid, id, hours || null);
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not snooze job", 400);
  }
}
