import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { addExistingOrCreateMember, membersForClient } from "@/lib/members";
import { memberCreateSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "people.view")) return jsonError("Forbidden", 403);
  const members = await membersForClient(session.tid, session);
  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "people.manage")) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = memberCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const result = await addExistingOrCreateMember(session.tid, session, {
      email: parsed.data.email,
      name: parsed.data.name || undefined,
      password: parsed.data.password || undefined,
      roleKey: parsed.data.role,
    });
    return NextResponse.json(
      { member: result.membership, createdUser: result.createdUser },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not add teammate", 400);
  }
}
