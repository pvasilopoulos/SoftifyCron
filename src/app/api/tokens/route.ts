import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { apiTokenNameSchema } from "@/lib/validators";
import { createApiToken, listApiTokens } from "@/lib/api-tokens";
import { writeAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/acl";
import { jsonError, zodError } from "@/lib/http";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  return NextResponse.json({ tokens: await listApiTokens(session.tid) });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = apiTokenNameSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const token = await createApiToken(session.tid, parsed.data.name);
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "token.create",
    target: token.id,
    meta: { name: token.name, prefix: token.prefix },
  });
  return NextResponse.json(
    {
      token: {
        id: token.id,
        name: token.name,
        prefix: token.prefix,
        lastUsedAt: token.lastUsedAt,
        createdAt: token.createdAt,
      },
      raw: token.raw,
    },
    { status: 201 },
  );
}
