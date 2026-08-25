import { NextResponse } from "next/server";
import { getPlatformAdmin } from "@/lib/session";
import { membersForClient, provisionTenantPerson } from "@/lib/members";
import { platformPersonSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const members = await membersForClient(id, { ...session, role: "OWNER", platform: true });
  return NextResponse.json({ members });
}

export async function POST(request: Request, { params }: Ctx) {
  const session = await getPlatformAdmin();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = platformPersonSchema.omit({ tenantId: true }).safeParse({
    ...body,
  });
  if (!parsed.success) return zodError(parsed.error);
  try {
    const result = await provisionTenantPerson(id, {
      email: parsed.data.email,
      name: parsed.data.name || undefined,
      password: parsed.data.password || undefined,
      role: parsed.data.role,
    });
    return NextResponse.json(
      { member: result.membership, createdUser: result.createdUser },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not add user", 400);
  }
}
