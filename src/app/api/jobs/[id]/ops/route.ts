import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { assignJob, pinGoldenBody, saveJobLibrary } from "@/lib/jobs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    golden?: boolean;
    libraryName?: string;
    libraryDescription?: string;
  };
  if (body.golden) {
    const job = await pinGoldenBody(session.tid, id, typeof body.email === "string" ? undefined : undefined);
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ ok: true, job });
  }
  if (body.libraryName) {
    const item = await saveJobLibrary(session.tid, id, body.libraryName, body.libraryDescription ?? "");
    if (!item) return jsonError("Job not found", 404);
    return NextResponse.json({ ok: true, item });
  }
  const job = await assignJob(session.tid, id, String(body.email ?? ""));
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ ok: true, job });
}
