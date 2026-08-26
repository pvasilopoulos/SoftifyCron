import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusBadgeSvg } from "@/lib/status-badge";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const host = new URL(request.url).host;
  const tenant = await prisma.tenant.findFirst({
    where: {
      statusPageEnabled: true,
      OR: [{ statusPageSlug: slug }, { statusCustomHost: host.toLowerCase() }],
    },
    select: { id: true, name: true },
  });
  if (!tenant) return new NextResponse("Not found", { status: 404 });
  const failing = await prisma.cronJob.count({
    where: { tenantId: tenant.id, lastStatus: { in: ["FAILED", "TIMEOUT", "BLOCKED"] } },
  });
  const svg = statusBadgeSvg(tenant.name, failing === 0);
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
