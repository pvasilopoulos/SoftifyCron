import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import {
  canManageRoleCatalog,
  createTenantRole,
  listTenantRoles,
} from "@/lib/roles";
import { tenantRoleInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "people.view")) return jsonError("Forbidden", 403);
  const roles = await listTenantRoles(session.tid);
  return NextResponse.json({ roles });
}

export async function POST(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!canManageRoleCatalog(session)) return jsonError("Only owners can manage roles", 403);
  const body = await request.json().catch(() => null);
  const parsed = tenantRoleInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const role = await createTenantRole(session.tid, parsed.data);
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create role", 400);
  }
}
