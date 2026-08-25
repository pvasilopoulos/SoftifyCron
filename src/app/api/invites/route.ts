import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites";
import { inviteInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { canManage } from "@/lib/acl";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const invites = await listInvites(session.tid);
  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = inviteInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const { invite, url } = await createInvite(session.tid, parsed.data.email, parsed.data.role);
  return NextResponse.json({ invite, url }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  const ok = await revokeInvite(session.tid, id);
  if (!ok) return jsonError("Invite not found", 404);
  return NextResponse.json({ ok: true });
}
