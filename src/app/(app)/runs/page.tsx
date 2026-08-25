import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RunsBoard } from "@/components/runs-board";
import type { RunStatus } from "@prisma/client";

export const metadata = { title: "Run history" };

const STATUSES: RunStatus[] = [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILED",
  "TIMEOUT",
  "BLOCKED",
];

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; jobId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = STATUSES.find((value) => value === params.status);
  const jobId = params.jobId || undefined;
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  const tz = tenant?.timezone ?? "UTC";
  const runs = await prisma.jobRun.findMany({
    where: {
      tenantId: session.tid,
      ...(jobId ? { jobId } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [{ error: { contains: q } }, { job: { name: { contains: q } } }],
          }
        : {}),
    },
    include: { job: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Audit</p>
        <h1 className="mt-2 font-display text-4xl italic">Run history</h1>
      </div>
      <RunsBoard runs={runs} timezone={tz} query={{ q, status: status ?? "" }} />
    </div>
  );
}
