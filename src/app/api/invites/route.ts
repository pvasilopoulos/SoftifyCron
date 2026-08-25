import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites";
import { inviteInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";
import { assertCanInvite } from "@/lib/member-acl";
import { resolveTenantRole } from "@/lib/roles";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "people.manage")) return jsonError("Forbidden", 403);
  const invites = await listInvites(session.tid);
  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  const parsed = inviteInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const resolved = await resolveTenantRole(session.tid, parsed.data.role);
    assertCanInvite(
      { userId: session.sub, role: session.role, platform: session.platform, grants: session.grants },
      resolved.rank,
    );
    const { invite, url } = await createInvite(session.tid, parsed.data.email, resolved.key);
    return NextResponse.json({ invite, url }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not invite", 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "people.manage")) return jsonError("Forbidden", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  const ok = await revokeInvite(session.tid, id);
  if (!ok) return jsonError("Invite not found", 404);
  return NextResponse.json({ ok: true });
}
