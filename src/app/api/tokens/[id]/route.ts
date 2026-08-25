import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { revokeApiToken } from "@/lib/api-tokens";
import { writeAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/acl";
import { jsonError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const ok = await revokeApiToken(session.tid, id);
  if (!ok) return jsonError("Token not found", 404);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "token.revoke",
    target: id,
  });
  return NextResponse.json({ ok: true });
}
