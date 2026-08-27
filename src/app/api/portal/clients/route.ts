import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import { jsonError, zodError } from "@/lib/http";
import { portalClientSchema } from "@/lib/validators";
import {
  createPortalClient,
  listPortalClients,
  publicPortalClient,
} from "@/lib/portal";
import { writeAudit } from "@/lib/audit";
import { appUrl } from "@/lib/app-url";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const clients = await listPortalClients(session.tid);
  return NextResponse.json({ clients: clients.map((client) => publicPortalClient(client)) });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = portalClientSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const { client, raw } = await createPortalClient(session.tid, parsed.data);
    await writeAudit({
      tenantId: session.tid,
      actorId: session.sub,
      action: "portal.client.create",
      target: client.id,
      meta: { name: client.name },
    });
    return NextResponse.json(
      { client: publicPortalClient(client, { raw, origin: appUrl() }), raw },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create client", 400);
  }
}
