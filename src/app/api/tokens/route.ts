import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { apiTokenNameSchema } from "@/lib/validators";
import { createApiToken, listApiTokens } from "@/lib/api-tokens";
import { parseApiScopes, type ApiScope } from "@/lib/api-scopes";
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
  const daysRaw = parsed.data.expiresInDays;
  const daysNum = daysRaw == null || daysRaw === "" ? 0 : Number(daysRaw);
  const expiresInDays = Number.isFinite(daysNum) && daysNum > 0 ? Math.trunc(daysNum) : null;
  const scopes = parseApiScopes(parsed.data.scopes) as ApiScope[];
  const token = await createApiToken(session.tid, {
    name: parsed.data.name,
    scopes: scopes.length ? scopes : undefined,
    expiresInDays,
  });
  await writeAudit({
    tenantId: session.tid,
    actorId: session.sub,
    action: "token.create",
    target: token.id,
    meta: { name: token.name, prefix: token.prefix, scopes: token.scopes },
  });
  return NextResponse.json(
    {
      token: {
        id: token.id,
        name: token.name,
        prefix: token.prefix,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        createdAt: token.createdAt,
      },
      raw: token.raw,
    },
    { status: 201 },
  );
}
