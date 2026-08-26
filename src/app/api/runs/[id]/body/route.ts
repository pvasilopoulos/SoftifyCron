import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/acl";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getTenantSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!hasPermission(session, "runs.view")) return jsonError("Forbidden", 403);
  const { id } = await params;
  const run = await prisma.jobRun.findFirst({
    where: { id, tenantId: session.tid },
    select: { responseBody: true, job: { select: { name: true } } },
  });
  if (!run?.responseBody) return jsonError("No stored body", 404);
  return new NextResponse(run.responseBody, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${(run.job.name || "run").replace(/[^\w.-]+/g, "_")}.txt"`,
    },
  });
}
