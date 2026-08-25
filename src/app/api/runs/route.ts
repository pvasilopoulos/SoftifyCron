import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);
  const statuses = ["PENDING", "RUNNING", "SUCCESS", "FAILED", "TIMEOUT", "BLOCKED"] as const;
  const statusFilter = statuses.find((value) => value === status);

  const runs = await prisma.jobRun.findMany({
    where: {
      tenantId: session.tid,
      ...(jobId ? { jobId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { error: { contains: q } },
              { job: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { job: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take,
  });

  return NextResponse.json({ runs });
}
