import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { createSecret, deleteSecret, listSecrets } from "@/lib/secrets";
import { secretInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "secrets.manage")) return jsonError("Forbidden", 403);
  const secrets = await listSecrets(session.tid);
  return NextResponse.json({ secrets });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "secrets.manage")) return jsonError("Forbidden", 403);
  const body = await request.json().catch(() => null);
  const parsed = secretInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const secret = await createSecret(session.tid, parsed.data);
    return NextResponse.json(
      { secret: { id: secret.id, name: secret.name, key: secret.key } },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save secret", 400);
  }
}

export async function DELETE(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "secrets.manage")) return jsonError("Forbidden", 403);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("Missing id");
  const ok = await deleteSecret(session.tid, id);
  if (!ok) return jsonError("Secret not found", 404);
  return NextResponse.json({ ok: true });
}
