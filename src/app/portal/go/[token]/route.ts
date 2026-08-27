import { NextResponse } from "next/server";
import { verifyPortalMagic } from "@/lib/portal-magic";
import { prisma } from "@/lib/prisma";
import { parseEmails } from "@/lib/notify-policy";
import { redirectWithPortalSession } from "@/lib/portal-cookie";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { token } = await params;
  const parsed = verifyPortalMagic(decodeURIComponent(token ?? ""));
  if (!parsed) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", request.url));
  }
  const client = await prisma.portalClient.findUnique({
    where: { id: parsed.clientId },
  });
  if (!client || !parseEmails(client.email).includes(parsed.email)) {
    return NextResponse.redirect(new URL("/portal/login?error=invalid", request.url));
  }
  return redirectWithPortalSession(request, {
    kind: "client",
    tenantId: client.tenantId,
    clientId: client.id,
    name: client.name,
    sv: client.sessionEpoch,
  });
}
