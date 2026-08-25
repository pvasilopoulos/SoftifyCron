import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { canManageRoleCatalog, deleteTenantRole, updateTenantRole } from "@/lib/roles";
import { tenantRoleUpdateSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManageRoleCatalog(session)) return jsonError("Only owners can manage roles", 403);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tenantRoleUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const role = await updateTenantRole(session.tid, id, parsed.data);
    if (!role) return jsonError("Role not found", 404);
    return NextResponse.json({ role });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update role", 400);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManageRoleCatalog(session)) return jsonError("Only owners can manage roles", 403);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const reassignTo =
    (typeof body?.reassignTo === "string" && body.reassignTo) ||
    new URL(request.url).searchParams.get("reassignTo") ||
    undefined;
  try {
    const ok = await deleteTenantRole(session.tid, id, reassignTo);
    if (!ok) return jsonError("Role not found", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete role", 400);
  }
}
