import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantSession, signSession, setSessionCookie, clearSessionCookie } from "@/lib/session";
import { changeMemberGrants, changeMemberRole, removeMember } from "@/lib/members";
import { memberRoleSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = memberRoleSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    let member = null;
    if (parsed.data.role) {
      member = await changeMemberRole(session.tid, id, session, parsed.data.role);
    }
    if (parsed.data.grants && (!parsed.data.role || parsed.data.role === "MEMBER")) {
      member = await changeMemberGrants(session.tid, id, session, parsed.data.grants);
    }
    if (!member) return jsonError("Member not found", 404);
    if (member.userId === session.sub && !session.platform) {
      await setSessionCookie(
        await signSession({ ...session, role: member.role, grants: member.grants }),
      );
    }
    return NextResponse.json({ member });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not change role", 400);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  try {
    const membership = await prisma.membership.findFirst({
      where: { id, tenantId: session.tid },
      select: { userId: true },
    });
    const ok = await removeMember(session.tid, id, session);
    if (!ok) return jsonError("Member not found", 404);
    const left = membership?.userId === session.sub && !session.platform;
    if (left) await clearSessionCookie();
    return NextResponse.json({ ok: true, left });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not remove teammate", 400);
  }
}
