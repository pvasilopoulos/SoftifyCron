import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { createInvite, listInvites, revokeInvite } from "@/lib/invites";
import { platformInviteSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const invites = await listInvites(id);
  return NextResponse.json({ invites });
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = platformInviteSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const { invite, url } = await createInvite(id, parsed.data.email, parsed.data.role);
    return NextResponse.json({ invite, url }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not invite", 400);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const inviteId = new URL(request.url).searchParams.get("id");
  if (!inviteId) return jsonError("Missing id");
  const ok = await revokeInvite(id, inviteId);
  if (!ok) return jsonError("Invite not found", 404);
  return NextResponse.json({ ok: true });
}
