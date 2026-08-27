import { NextResponse } from "next/server";
import { findLegacyPortalTenant, findPortalClientByToken } from "@/lib/portal";
import { redirectWithPortalSession } from "@/lib/portal-cookie";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { token } = await params;
  const raw = decodeURIComponent(token ?? "").trim();
  const client = await findPortalClientByToken(raw);
  if (client) {
    return redirectWithPortalSession(request, {
      kind: "client",
      tenantId: client.tenantId,
      clientId: client.id,
      name: client.name,
      sv: client.sessionEpoch,
    });
  }
  const tenant = await findLegacyPortalTenant(raw);
  if (tenant) {
    return redirectWithPortalSession(request, {
      kind: "legacy",
      tenantId: tenant.id,
      clientId: null,
      name: tenant.name,
      sv: 0,
    });
  }
  return NextResponse.redirect(new URL("/portal/login?error=invalid", request.url));
}
