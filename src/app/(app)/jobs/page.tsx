import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listJobs } from "@/lib/jobs";
import { listGroups } from "@/lib/groups";
import { canManage, JOB_TYPES } from "@/lib/acl";
import { JobsBoard } from "@/components/jobs-board";
import type { JobType } from "@prisma/client";

export const metadata = { title: "Jobs" };

const STATES = ["armed", "paused", "failing"] as const;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; type?: string; state?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const group = params.group ?? "";
  const type = JOB_TYPES.includes(params.type as JobType)
    ? (params.type as JobType)
    : "";
  const state = STATES.includes(params.state as (typeof STATES)[number])
    ? params.state
    : "";
  const manage = canManage(session.role);

  const [jobs, groups] = await Promise.all([
    listJobs(session.tid, {
      q: q || undefined,
      groupId: group || undefined,
      type: type || undefined,
      state: (state as "armed" | "paused" | "failing") || undefined,
    }),
    listGroups(session.tid),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Scheduler</p>
          <h1 className="mt-2 font-display text-4xl italic">Jobs</h1>
        </div>
        {manage ? (
          <Link href="/jobs/new" className="btn btn-gold hidden sm:inline-flex">
            New job
          </Link>
        ) : null}
      </div>

      <JobsBoard
        jobs={jobs}
        groups={groups}
        canManage={manage}
        query={{ q, group, type, state: state ?? "" }}
      />

      {manage ? (
        <Link href="/jobs/new" className="fab" aria-label="New job">
          +
        </Link>
      ) : null}
    </div>
  );
}
