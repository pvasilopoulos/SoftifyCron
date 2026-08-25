import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { changeMemberGrants, changeMemberRole, removeMember } from "@/lib/members";
import { memberRoleSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; membershipId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id, membershipId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = memberRoleSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const actor = { ...session, role: "OWNER" as const, platform: true };
  try {
    let member = null;
    if (parsed.data.role) {
      member = await changeMemberRole(id, membershipId, actor, parsed.data.role);
    }
    if (parsed.data.grants && (!parsed.data.role || parsed.data.role === "MEMBER")) {
      member = await changeMemberGrants(id, membershipId, actor, parsed.data.grants);
    }
    if (!member) return jsonError("Member not found", 404);
    return NextResponse.json({ member });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not change role", 400);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id, membershipId } = await params;
  try {
    const ok = await removeMember(id, membershipId, { ...session, role: "OWNER", platform: true });
    if (!ok) return jsonError("Member not found", 404);
    return NextResponse.json({ ok: true, left: false });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove teammate", 400);
  }
}
