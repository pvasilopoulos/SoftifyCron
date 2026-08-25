import { NextResponse } from "next/server";
import { getTenantSession, signSession, setSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tenantUpdateSchema } from "@/lib/validators";
import { jsonError, zodError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

export async function GET() {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tid },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tenant) return jsonError("Workspace not found", 404);
  return NextResponse.json({ tenant });
}

export async function PUT(request: Request) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "settings.edit")) {
    return jsonError("You cannot edit workspace settings", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = tenantUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const tenant = await prisma.tenant.update({
    where: { id: session.tid },
    data: {
      name: parsed.data.name,
      timezone: parsed.data.timezone,
    },
  });

  const token = await signSession({
    ...session,
    tname: tenant.name,
  });
  await setSessionCookie(token);

  return NextResponse.json({ tenant });
}
