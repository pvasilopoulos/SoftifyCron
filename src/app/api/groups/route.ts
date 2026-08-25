import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createGroup, deleteGroup, listGroups, updateGroup } from "@/lib/groups";
import { groupInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { canManage } from "@/lib/acl";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const groups = await listGroups(session.tid);
  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = groupInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const group = await createGroup(session.tid, parsed.data);
  return NextResponse.json({ group }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const parsed = groupInputSchema.safeParse(body);
  if (!id || !parsed.success) return jsonError("Invalid group");
  const group = await updateGroup(session.tid, id, parsed.data);
  if (!group) return jsonError("Group not found", 404);
  return NextResponse.json({ group });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManage(session.role)) return jsonError("Forbidden", 403);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Missing id");
  const ok = await deleteGroup(session.tid, id);
  if (!ok) return jsonError("Group not found", 404);
  return NextResponse.json({ ok: true });
}
