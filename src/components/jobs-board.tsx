"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { describeCron } from "@/lib/cron";
import { RelativeTime } from "@/components/relative-time";
import { StatusPill } from "@/components/status-pill";
import { JobMenu } from "@/components/job-menu";
import type { JobAccess } from "@/lib/acl";

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
  keepResponse: boolean;
  responseBoard?: boolean;
  nextRunAt: Date | string | null;
  lastRunAt: Date | string | null;
  lastStatus: string | null;
  group: Group | null;
};

type Section = { key: string; name: string; color: string; jobs: Job[] };

function sectionsFrom(jobs: Job[], groups: Group[]): Section[] {
  const byId = new Map<string, Job[]>();
  const ungrouped: Job[] = [];
  for (const job of jobs) {
    if (job.group) {
      const list = byId.get(job.group.id) ?? [];
      list.push(job);
      byId.set(job.group.id, list);
    } else {
      ungrouped.push(job);
    }
  }
  const sections: Section[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const list = byId.get(group.id);
    if (!list?.length) continue;
    sections.push({ key: group.id, name: group.name, color: group.color, jobs: list });
    seen.add(group.id);
  }
  for (const [id, list] of byId) {
    if (seen.has(id) || list.length === 0) continue;
    const group = list[0]!.group!;
    sections.push({ key: id, name: group.name, color: group.color, jobs: list });
  }
  sections.sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (ungrouped.length > 0) {
    sections.push({ key: "none", name: "Ungrouped", color: "#8b93a7", jobs: ungrouped });
  }
  return sections;
}

export function JobsBoard({
  jobs,
  groups,
  access,
  query,
}: {
  jobs: Job[];
  groups: Group[];
  access: JobAccess;
  query: { q: string; group: string; type: string; state: string };
}) {
  const canSelect = access.edit || access.run || access.delete;
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

  const sections = useMemo(() => sectionsFrom(jobs, groups), [jobs, groups]);

  function toggleId(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
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
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            className="field"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name, URL, tags…"
            aria-label="Search jobs"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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

      {canSelect && selected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gold/30 bg-gold/8 p-3">
          <span className="text-sm">{selected.length} selected</span>
          {access.edit ? (
            <>
              <button className="btn btn-ghost" type="button" onClick={() => bulk("pause")} disabled={pending}>
                Pause
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => bulk("resume")} disabled={pending}>
                Resume
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
            </>
          ) : null}
          {access.run ? (
            <button className="btn btn-ghost" type="button" onClick={() => bulk("run")} disabled={pending}>
              Run
            </button>
          ) : null}
          {access.delete ? (
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
          ) : null}
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-3xl">
            {query.q || query.group || query.type || query.state
              ? "No jobs match."
              : "This tenant is quiet."}
          </p>
          <p className="mt-2 text-ink-dim">
            {query.q || query.group || query.type || query.state
              ? "Create one or clear filters."
              : "Create an HTTP job and the worker will claim it when due."}
          </p>
          {access.edit ? (
            <Link href="/jobs/new" className="btn btn-gold mt-5">
              New job
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <span className="h-3 w-3 rounded-full" style={{ background: section.color }} />
                <h2 className="font-display text-2xl">{section.name}</h2>
                <span className="text-xs text-ink-dim">{section.jobs.length}</span>
              </div>

              <div className="grid gap-3 md:hidden">
                {section.jobs.map((job) => (
                  <article key={job.id} className="card card-hover p-4">
                    <div className="flex items-start gap-3">
                      {canSelect ? (
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5"
                          checked={selected.includes(job.id)}
                          onChange={(event) => toggleId(job.id, event.target.checked)}
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/jobs/${job.id}`} className="min-w-0 break-any font-medium">
                            {job.name}
                          </Link>
                          <JobMenu
                            jobId={job.id}
                            name={job.name}
                            enabled={job.enabled}
                            keepResponse={job.keepResponse}
                            responseBoard={job.responseBoard}
                            access={access}
                          />
                        </div>
                        <p className="mono mt-1 truncate text-xs text-ink-dim">
                          {job.method} {job.url}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-bg-mute px-2 py-1">{job.type}</span>
                          <span className={job.enabled ? "text-sage" : "text-ink-dim"}>
                            {job.enabled ? "armed" : "paused"}
                          </span>
                          {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                        </div>
                        <p className="mt-2 text-xs text-ink-dim">
                          Next <RelativeTime value={job.nextRunAt} timeZone={job.timezone} />
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="table-wrap hidden md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
                    <tr>
                      {canSelect ? (
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={section.jobs.every((job) => selected.includes(job.id))}
                            onChange={(event) => {
                              const ids = section.jobs.map((job) => job.id);
                              setSelected((current) =>
                                event.target.checked
                                  ? [...new Set([...current, ...ids])]
                                  : current.filter((id) => !ids.includes(id)),
                              );
                            }}
                          />
                        </th>
                      ) : null}
                      <th className="px-4 py-3 font-medium">Job</th>
                      <th className="px-4 py-3 font-medium">Schedule</th>
                      <th className="px-4 py-3 font-medium">Next</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.jobs.map((job) => (
                      <tr key={job.id} className="row-hover border-t border-line bg-bg-elev/70">
                        {canSelect ? (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(job.id)}
                              onChange={(event) => toggleId(job.id, event.target.checked)}
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
                        <td className="px-4 py-3 text-ink-dim">{describeCron(job.cronExpr)}</td>
                        <td className="px-4 py-3 text-ink-dim">
                          <RelativeTime value={job.nextRunAt} timeZone={job.timezone} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={job.enabled ? "text-sage" : "text-ink-dim"}>
                              {job.enabled ? "armed" : "paused"}
                            </span>
                            {job.lastStatus ? <StatusPill status={job.lastStatus} /> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <JobMenu
                            jobId={job.id}
                            name={job.name}
                            enabled={job.enabled}
                            keepResponse={job.keepResponse}
                            responseBoard={job.responseBoard}
                            access={access}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
