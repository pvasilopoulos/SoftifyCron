import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getJobForTenant, getLatestRun } from "@/lib/jobs";
import { formatAbsolute, formatDuration } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";
import { ResponseBody } from "@/components/response-body";

export const metadata = { title: "Last response" };

function pretty(raw: string | null) {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default async function JobResponsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const job = await getJobForTenant(session.tid, id);
  if (!job) notFound();
  const run = await getLatestRun(session.tid, job.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/jobs/${job.id}`} className="text-xs uppercase tracking-[0.16em] text-ink-dim">
          ← {job.name}
        </Link>
        <h1 className="mt-2 font-display text-4xl">Last response</h1>
        <p className="mt-2 text-sm text-ink-dim">
        Stored only for jobs with Keep last response on. Bodies are decoded from UTF-8,
        Windows-1253, ISO-8859-7, or Windows-1252 when the charset is missing or wrong.
      </p>
      </div>

      {!job.keepResponse ? (
        <div className="card p-6">
          <p className="text-ink-dim">
            This job does not keep response bodies. Turn on the flag in Edit if you want the
            View response menu.
          </p>
          <Link href={`/jobs/${job.id}/edit`} className="btn btn-gold mt-4">
            Edit job
          </Link>
        </div>
      ) : !run ? (
        <div className="card p-6 text-ink-dim">No runs yet. Fire the job once to capture a body.</div>
      ) : (
        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={run.status} />
            <span className="text-sm text-ink-dim">{run.trigger.toLowerCase()}</span>
            <span className="mono text-sm">HTTP {run.httpStatus ?? "—"}</span>
            <span className="text-sm text-ink-dim">{formatDuration(run.durationMs)}</span>
          </div>
          <p className="mono mt-3 text-xs text-ink-dim">
            {formatAbsolute(run.startedAt, job.timezone)}
            {run.responseCharset ? ` · decoded as ${run.responseCharset}` : ""}
          </p>
          {run.error ? <p className="mt-3 text-sm text-rose">{run.error}</p> : null}
          <div className="mt-5">
            {run.responseBody ? (
              <ResponseBody body={pretty(run.responseBody)} />
            ) : (
              <p className="text-sm text-ink-dim">
                No body stored on this run. Run the job again after enabling the flag.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
