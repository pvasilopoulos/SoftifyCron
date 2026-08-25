import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { createTenantRole, listTenantRoles } from "@/lib/roles";
import { tenantRoleInputSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const roles = await listTenantRoles(id);
  return NextResponse.json({ roles });
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tenantRoleInputSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  try {
    const role = await createTenantRole(id, parsed.data);
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create role", 400);
  }
}
