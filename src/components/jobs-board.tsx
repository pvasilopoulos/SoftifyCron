"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { describeCron } from "@/lib/cron";
import { formatDateTime } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";

type Group = { id: string; name: string; color: string; slug: string };
type Job = {
  id: string;
  name: string;
  url: string;
  method: string;
  type: string;
  tags: string;
  cronExpr: string;
  timezone: string;
  enabled: boolean;
  nextRunAt: Date | string | null;
  lastRunAt: Date | string | null;
  lastStatus: string | null;
  group: Group | null;
};

export function JobsBoard({
  jobs,
  groups,
  canManage,
  query,
}: {
  jobs: Job[];
  groups: Group[];
  canManage: boolean;
  query: { q: string; group: string; type: string; state: string };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(query.q);

  function apply(next: Partial<typeof query>) {
    const params = new URLSearchParams();
    const merged = { ...query, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.group) params.set("group", merged.group);
    if (merged.type) params.set("type", merged.type);
    if (merged.state) params.set("state", merged.state);
    router.push(`/jobs?${params.toString()}`);
  }

  async function bulk(action: string, groupId?: string | null) {
    if (selected.length === 0) return;
    await fetch("/api/jobs/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ids: selected, groupId }),
    });
    setSelected([]);
    startTransition(() => router.refresh());
  }

  const allIds = useMemo(() => jobs.map((job) => job.id), [jobs]);

  return (
    <div className="space-y-4">
      <form
        className="card p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q });
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            className="field"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, URL, tags…"
            aria-label="Search jobs"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select
              className="field"
              value={query.group}
              onChange={(event) => apply({ group: event.target.value })}
            >
              <option value="">All groups</option>
              <option value="none">Ungrouped</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={query.type}
              onChange={(event) => apply({ type: event.target.value })}
            >
              <option value="">All types</option>
              <option>HTTP</option>
              <option>HEARTBEAT</option>
              <option>WEBHOOK</option>
            </select>
            <select
              className="field"
              value={query.state}
              onChange={(event) => apply({ state: event.target.value })}
            >
              <option value="">Any state</option>
              <option value="armed">Armed</option>
              <option value="paused">Paused</option>
              <option value="failing">Failing</option>
            </select>
            <button className="btn btn-gold" type="submit">
              Search
            </button>
          </div>
        </div>
      </form>

      {canManage && selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gold/30 bg-gold/8 p-3">
          <span className="text-sm">{selected.length} selected</span>
          <button className="btn btn-ghost" type="button" onClick={() => bulk("pause")} disabled={pending}>
            Pause
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => bulk("resume")} disabled={pending}>
            Resume
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => bulk("run")} disabled={pending}>
            Run
          </button>
          <select
            className="field max-w-40"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) bulk("move", event.target.value === "none" ? null : event.target.value);
            }}
          >
            <option value="">Move to…</option>
            <option value="none">Ungrouped</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => {
              if (confirm(`Delete ${selected.length} jobs and their history?`)) bulk("delete");
            }}
            disabled={pending}
          >
            Delete
          </button>
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-3xl italic">
            {query.q || query.group || query.type || query.state
              ? "No jobs match."
              : "This tenant is quiet."}
          </p>
          <p className="mt-2 text-ink-dim">
            {query.q || query.group || query.type || query.state
              ? "Create one or clear filters."
              : "Create an HTTP job and the worker will claim it when due."}
          </p>
          {canManage ? (
            <Link href="/jobs/new" className="btn btn-gold mt-5">
              New job
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {jobs.map((job) => (
              <article key={job.id} className="card p-4">
                <div className="flex items-start gap-3">
                  {canManage ? (
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={selected.includes(job.id)}
                      onChange={(event) => {
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, job.id]
                            : current.filter((id) => id !== job.id),
                        );
                      }}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <Link href={`/jobs/${job.id}`} className="font-medium">
                      {job.name}
                    </Link>
                    <p className="mono mt-1 truncate text-xs text-ink-dim">
                      {job.method} {job.url}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span
                        className="rounded-full px-2 py-1"
                        style={{ background: `${job.group?.color ?? "#8b93a7"}22`, color: job.group?.color ?? "#8b93a7" }}
                      >
                        {job.group?.name ?? "Ungrouped"}
                      </span>
                      <span className="rounded-full bg-bg-mute px-2 py-1">{job.type}</span>
                      <span className={job.enabled ? "text-sage" : "text-ink-dim"}>
                        {job.enabled ? "armed" : "paused"}
                      </span>
                      {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                    </div>
                    <p className="mt-2 text-xs text-ink-dim">
                      Next {formatDateTime(job.nextRunAt, job.timezone)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-[1.35rem] border border-line md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
                <tr>
                  {canManage ? (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length === allIds.length && allIds.length > 0}
                        onChange={(event) => setSelected(event.target.checked ? allIds : [])}
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-medium">Job</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium">Next</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-line bg-bg-elev/70">
                    {canManage ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(job.id)}
                          onChange={(event) => {
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, job.id]
                                : current.filter((id) => id !== job.id),
                            );
                          }}
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-gold">
                        {job.name}
                      </Link>
                      <p className="mono mt-1 text-xs text-ink-dim">
                        {job.type} · {job.method} {job.url}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-dim">{job.group?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-dim">{describeCron(job.cronExpr)}</td>
                    <td className="px-4 py-3 text-ink-dim">
                      {formatDateTime(job.nextRunAt, job.timezone)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={job.enabled ? "text-sage" : "text-ink-dim"}>
                          {job.enabled ? "armed" : "paused"}
                        </span>
                        {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                      </div>
                    </td>
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
