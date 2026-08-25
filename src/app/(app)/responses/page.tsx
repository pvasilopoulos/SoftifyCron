import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { hasPermission } from "@/lib/acl";
import {
  catalogRow,
  latestBodiesByJob,
  listJobResponseRuns,
  listKeptResponseJobs,
  listResponseBoardJobs,
} from "@/lib/responses";
import { ResponsesBoard } from "@/components/responses-board";

export const metadata = { title: "Responses" };

export default async function ResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session, "runs.view")) notFound();
  const params = await searchParams;
  const selectedId = params.job?.trim() || null;

  const [tabs, kept] = await Promise.all([
    listResponseBoardJobs(session.tid),
    listKeptResponseJobs(session.tid),
  ]);
  const selected = selectedId ? tabs.find((job) => job.id === selectedId) : null;
  if (selectedId && !selected) notFound();

  const latest = await latestBodiesByJob(
    session.tid,
    kept.map((job) => job.id),
  );
  const latestMap = new Map(latest.map((run) => [run.jobId, run]));
  const catalog = kept.map((job) => catalogRow(job, latestMap.get(job.id)));
  const runs = selected
    ? (await listJobResponseRuns(session.tid, selected.id)).map((run) => ({
        ...run,
        startedAt: run.startedAt.toISOString(),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Archive</p>
        <h1 className="mt-2 font-display text-4xl">Responses</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Every job with Keep last response stores bodies here. Turn on Response board on a job to
          pin it as its own tab and open a detailed grid.
        </p>
        <Link href="/jobs" className="mt-3 inline-block text-sm text-gold">
          Manage jobs
        </Link>
      </div>
      <ResponsesBoard
        key={selected?.id ?? "all"}
        catalog={catalog}
        tabs={tabs}
        selectedId={selected?.id ?? null}
        selectedName={selected?.name}
        timezone={selected?.timezone ?? "Europe/Athens"}
        runs={runs}
      />
    </div>
  );
}
