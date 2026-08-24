import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);

  const runs = await prisma.jobRun.findMany({
    where: {
      tenantId: session.tid,
      ...(jobId ? { jobId } : {}),
    },
    include: { job: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take,
  });

  return NextResponse.json({ runs });
}
