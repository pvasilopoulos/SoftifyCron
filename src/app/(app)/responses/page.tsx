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
  searchResponseBodies,
} from "@/lib/responses";
import { ResponsesBoard } from "@/components/responses-board";

export const metadata = { title: "Responses" };

export default async function ResponsesPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; q?: string }>;
}) {
  const session = await requireSession();
  if (!hasPermission(session, "runs.view")) notFound();
  const params = await searchParams;
  const selectedId = params.job?.trim() || null;
  const query = params.q?.trim() ?? "";

  const [tabs, kept, hits] = await Promise.all([
    listResponseBoardJobs(session.tid),
    listKeptResponseJobs(session.tid),
    query.length >= 2 ? searchResponseBodies(session.tid, query) : Promise.resolve([]),
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
          pin it as its own tab and open a detailed grid. Search looks through stored bodies.
        </p>
        <Link href="/jobs" className="mt-3 inline-block text-sm text-gold">
          Manage jobs
        </Link>
      </div>
      <ResponsesBoard
        key={`${selected?.id ?? "all"}-${query}`}
        catalog={catalog}
        tabs={tabs}
        selectedId={selected?.id ?? null}
        selectedName={selected?.name}
        timezone={selected?.timezone ?? "Europe/Athens"}
        runs={runs}
        query={query}
        hits={hits.map((hit) => ({
          id: hit.id,
          jobId: hit.jobId,
          jobName: hit.job.name,
          status: hit.status,
          httpStatus: hit.httpStatus,
          startedAt: hit.startedAt.toISOString(),
          board: hit.job.responseBoard,
        }))}
      />
    </div>
  );
}
