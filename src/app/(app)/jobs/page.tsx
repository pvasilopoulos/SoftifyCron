import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listJobs } from "@/lib/jobs";
import { describeCron } from "@/lib/cron";
import { formatDateTime } from "@/lib/format";
export const metadata = { title: "Jobs" };

export default async function JobsPage() {
  const session = await requireSession();
  const jobs = await listJobs(session.tid);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Scheduler</p>
          <h1 className="mt-2 font-display text-4xl italic">Jobs</h1>
        </div>
        <Link href="/jobs/new" className="btn btn-gold">
          New job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-3xl italic">This tenant is quiet.</p>
          <p className="mt-3 text-ink-dim">
            Create an HTTP job and the worker will claim it when due.
          </p>
          <Link href="/jobs/new" className="btn btn-gold mt-6">
            Create the first job
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.25rem] border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
              <tr>
                <th className="px-5 py-3 font-medium">Job</th>
                <th className="px-5 py-3 font-medium">Schedule</th>
                <th className="px-5 py-3 font-medium">Next</th>
                <th className="px-5 py-3 font-medium">Last</th>
                <th className="px-5 py-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                return (
                  <tr key={job.id} className="border-t border-line bg-bg-elev/70">
                    <td className="px-5 py-4">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-gold">
                        {job.name}
                      </Link>
                      <p className="mono mt-1 text-xs text-ink-dim">
                        {job.method} {job.url}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-ink-dim">
                      {describeCron(job.cronExpr)}
                    </td>
                    <td className="px-5 py-4 text-ink-dim">
                      {formatDateTime(job.nextRunAt, job.timezone)}
                    </td>
                    <td className="px-5 py-4 text-ink-dim">
                      {formatDateTime(job.lastRunAt, job.timezone)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={job.enabled ? "text-sage" : "text-ink-dim"}>
                        {job.enabled ? "armed" : "paused"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
