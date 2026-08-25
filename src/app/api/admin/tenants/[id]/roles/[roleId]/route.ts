import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { deleteTenantRole, updateTenantRole } from "@/lib/roles";
import { tenantRoleUpdateSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; roleId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id, roleId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tenantRoleUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const role = await updateTenantRole(id, roleId, parsed.data);
    if (!role) return jsonError("Role not found", 404);
    return NextResponse.json({ role });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not update role", 400);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id, roleId } = await params;
  const body = await request.json().catch(() => null);
  const reassignTo =
    (typeof body?.reassignTo === "string" && body.reassignTo) ||
    new URL(request.url).searchParams.get("reassignTo") ||
    undefined;
  try {
    const ok = await deleteTenantRole(id, roleId, reassignTo);
    if (!ok) return jsonError("Role not found", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete role", 400);
  }
}
