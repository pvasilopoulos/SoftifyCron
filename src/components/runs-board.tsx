"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatAbsolute, formatDuration } from "@/lib/format";
import { RelativeTime } from "@/components/relative-time";
import { StatusPill } from "@/components/status-pill";

type Run = {
  id: string;
  status: string;
  trigger: string;
  startedAt: Date | string;
  httpStatus: number | null;
  durationMs: number | null;
  error: string | null;
  job: { name: string };
};

export function RunsBoard({
  runs,
  timezone,
  query,
}: {
  runs: Run[];
  timezone: string;
  query: { q: string; status: string };
}) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);

  function apply(next: Partial<typeof query>) {
    const params = new URLSearchParams();
    const merged = { ...query, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.status) params.set("status", merged.status);
    router.push(`/runs?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <form
        className="card p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q });
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="field"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search job or error…"
            aria-label="Search runs"
          />
          <select
            className="field sm:max-w-48"
            value={query.status}
            onChange={(event) => apply({ status: event.target.value })}
          >
            <option value="">Any status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="TIMEOUT">Timeout</option>
            <option value="BLOCKED">Blocked</option>
            <option value="RUNNING">Running</option>
          </select>
          <button className="btn btn-gold" type="submit">
            Filter
          </button>
        </div>
      </form>

      {runs.length === 0 ? (
        <div className="card p-8 text-center text-ink-dim">No runs match these filters.</div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {runs.map((run) => (
              <article key={run.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{run.job.name}</p>
                  <StatusPill status={run.status} />
                </div>
                <p className="mt-2 text-xs text-ink-dim">
                  <RelativeTime value={run.startedAt} timeZone={timezone} />
                </p>
                <p className="mono mt-1 text-xs text-ink-dim">
                  {formatAbsolute(run.startedAt, timezone)}
                </p>
                <p className="mt-2 text-sm text-ink-dim">
                  {run.trigger.toLowerCase()} · HTTP {run.httpStatus ?? "—"} ·{" "}
                  {formatDuration(run.durationMs)}
                </p>
                {run.error ? <p className="mt-2 text-sm text-rose">{run.error}</p> : null}
              </article>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-[1.25rem] border border-line md:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
                <tr>
                  <th className="px-5 py-3 font-medium">Job</th>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Trigger</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">HTTP</th>
                  <th className="px-5 py-3 font-medium">Duration</th>
                  <th className="px-5 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-line bg-bg-elev/70">
                    <td className="px-5 py-3 font-medium">{run.job.name}</td>
                    <td className="px-5 py-3">
                      <RelativeTime value={run.startedAt} timeZone={timezone} />
                      <p className="mono mt-1 text-xs text-ink-dim">
                        {formatAbsolute(run.startedAt, timezone)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-ink-dim">
                      {run.trigger.toLowerCase()}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-5 py-3 mono">{run.httpStatus ?? "—"}</td>
                    <td className="px-5 py-3">{formatDuration(run.durationMs)}</td>
                    <td className="px-5 py-3 text-ink-dim">{run.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
