import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import { jsonError, zodError } from "@/lib/http";
import { portalClientSchema } from "@/lib/validators";
import {
  deletePortalClient,
  publicPortalClient,
  rotatePortalClient,
  updatePortalClient,
} from "@/lib/portal";
import { writeAudit } from "@/lib/audit";
import { appUrl } from "@/lib/app-url";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = portalClientSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const client = await updatePortalClient(session.tid, id, parsed.data);
    if (!client) return jsonError("Client not found", 404);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "portal.client.update",
      target: id,
    });
    return NextResponse.json({ client: publicPortalClient(client) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update client", 400);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "rotate") return jsonError("Unknown action", 400);
  const rotated = await rotatePortalClient(session.tid, id);
  if (!rotated) return jsonError("Client not found", 404);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "portal.client.rotate",
    target: id,
  });
  return NextResponse.json({
    client: publicPortalClient(rotated.client, { raw: rotated.raw, origin: appUrl() }),
    raw: rotated.raw,
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const ok = await deletePortalClient(session.tid, id);
  if (!ok) return jsonError("Client not found", 404);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "portal.client.revoke",
    target: id,
  });
  return NextResponse.json({ ok: true });
}
