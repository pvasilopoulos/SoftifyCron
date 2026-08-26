import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import { jsonError } from "@/lib/http";
import { clearJobHook, rotateJobHook } from "@/lib/jobs";
import { hookUrl } from "@/lib/inbound";
import { appUrl } from "@/lib/app-url";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("You cannot edit jobs", 403);
  const { id } = await context.params;
  const token = await rotateJobHook(session.tid, id);
  if (!token) return jsonError("Job not found", 404);
  return NextResponse.json({
    ok: true,
    token: token.token,
    prefix: token.prefix,
    url: hookUrl(appUrl(), token.token),
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "jobs.edit")) return jsonError("You cannot edit jobs", 403);
  const { id } = await context.params;
  const job = await clearJobHook(session.tid, id);
  if (!job) return jsonError("Job not found", 404);
  return NextResponse.json({ ok: true });
}
