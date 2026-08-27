"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { RelativeTime } from "@/components/relative-time";
import { ResponseGridView } from "@/components/response-grid";
import { parseResponseGrid } from "@/lib/response-grid";

export type ResponseCatalogRow = {
  jobId: string;
  name: string;
  timezone: string;
  responseBoard: boolean;
  lastStatus: string | null;
  groupName: string;
  groupColor: string;
  runId: string | null;
  runStatus: string | null;
  httpStatus: number | null;
  startedAt: string | null;
  charset: string | null;
  error: string | null;
  preview: {
    columns: string[];
    rows: string[][];
    totalRows: number;
    source: string;
    title?: string;
  };
};

export type ResponseRun = {
  id: string;
  status: string;
  httpStatus: number | null;
  startedAt: string;
  durationMs: number | null;
  responseBody: string | null;
  responseCharset: string | null;
  error: string | null;
  trigger: string;
};

export type ResponseJobTab = {
  id: string;
  name: string;
  timezone: string;
  lastStatus: string | null;
  gridViews?: unknown;
  gridWatches?: unknown;
};

export function ResponsesBoard({
  catalog,
  tabs,
  selectedId,
  selectedName,
  timezone,
  runs,
  query = "",
  hits = [],
}: {
  catalog: ResponseCatalogRow[];
  tabs: ResponseJobTab[];
  selectedId: string | null;
  selectedName?: string;
  timezone: string;
  runs: ResponseRun[];
  query?: string;
  hits?: Array<{
    id: string;
    jobId: string;
    jobName: string;
    status: string;
    httpStatus: number | null;
    startedAt: string;
    board: boolean;
  }>;
}) {
  const [runId, setRunId] = useState(runs[0]?.id ?? "");
  const selectedRun = useMemo(
    () => runs.find((run) => run.id === runId) ?? runs[0] ?? null,
    [runId, runs],
  );
  const previousRun = useMemo(() => {
    const index = runs.findIndex((run) => run.id === selectedRun?.id);
    return index >= 0 ? (runs[index + 1] ?? null) : null;
  }, [runs, selectedRun?.id]);
  const [compareId, setCompareId] = useState(previousRun?.id ?? "");
  const compareRun = useMemo(() => {
    if (compareId) return runs.find((run) => run.id === compareId) ?? previousRun;
    return previousRun;
  }, [compareId, previousRun, runs]);
  const grid = useMemo(
    () => parseResponseGrid(selectedRun?.responseBody),
    [selectedRun?.responseBody],
  );
  const needle = query.trim().toLowerCase();
  const visibleCatalog = needle
    ? catalog.filter(
        (row) =>
          row.name.toLowerCase().includes(needle) ||
          hits.some((hit) => hit.jobId === row.jobId),
      )
    : catalog;

  return (
    <div className="space-y-4">
      <nav className="ws-tabs" aria-label="Response jobs">
        <Link href="/responses" className={!selectedId ? "is-on" : ""}>
          All
        </Link>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/responses?job=${tab.id}`}
            className={selectedId === tab.id ? "is-on" : ""}
          >
            {tab.name}
          </Link>
        ))}
      </nav>

      <form className="flex flex-wrap gap-2" action="/responses" method="get">
        {selectedId ? <input type="hidden" name="job" value={selectedId} /> : null}
        <label className="block min-w-56 flex-1">
          <span className="sr-only">Search responses</span>
          <input
            className="field"
            name="q"
            defaultValue={query}
            placeholder="Search stored bodies…"
          />
        </label>
        <button className="btn btn-ghost" type="submit">
          Search
        </button>
      </form>

      {!selectedId ? (
        catalog.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-display text-3xl">No stored responses yet.</p>
            <p className="mt-2 text-ink-dim">
              On a job, turn on Keep last response to archive bodies, and Response board to add a
              dedicated tab here.
            </p>
            <Link href="/jobs" className="btn btn-gold mt-5">
              Open jobs
            </Link>
          </div>
        ) : (
          <>
          {needle && hits.length > 0 ? (
            <div className="card p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-gold">Body matches</p>
              <ul className="mt-3 space-y-3">
                {hits.map((hit) => (
                  <li key={hit.id} className="flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={hit.board ? `/responses?job=${hit.jobId}` : `/jobs/${hit.jobId}/response`}
                        className="font-medium hover:text-gold"
                      >
                        {hit.jobName}
                      </Link>
                      <p className="text-xs text-ink-dim">
                        <RelativeTime value={hit.startedAt} timeZone={timezone} />
                        {hit.httpStatus != null ? ` · HTTP ${hit.httpStatus}` : ""}
                      </p>
                    </div>
                    <StatusPill status={hit.status} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {visibleCatalog.length === 0 ? (
            <div className="card p-8 text-ink-dim">No jobs match that search.</div>
          ) : (
          <div className="stat-grid">
            {visibleCatalog.map((row) => (
              <article key={row.jobId} className="card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-any font-medium">{row.name}</p>
                    <p className="mt-1 text-xs text-ink-dim" style={{ color: row.groupColor }}>
                      {row.groupName}
                    </p>
                  </div>
                  {row.runStatus ? <StatusPill status={row.runStatus} /> : null}
                </div>
                <p className="mt-3 text-xs text-ink-dim">
                  {row.startedAt ? (
                    <RelativeTime value={row.startedAt} timeZone={row.timezone} />
                  ) : (
                    "No body captured yet"
                  )}
                  {row.httpStatus != null ? ` · HTTP ${row.httpStatus}` : ""}
                </p>
                {row.preview.columns.length > 0 && row.preview.source !== "text" ? (
                  <p className="mt-3 truncate text-xs text-ink-dim">
                    {row.preview.title ? `${row.preview.title}: ` : ""}
                    {row.preview.columns.slice(0, 4).join(" · ")}
                    {row.preview.totalRows ? ` · ${row.preview.totalRows} rows` : ""}
                  </p>
                ) : row.preview.rows[0]?.[0] ? (
                  <p className="mt-3 line-clamp-3 text-sm text-ink-dim">{row.preview.rows[0][0]}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.responseBoard ? (
                    <Link href={`/responses?job=${row.jobId}`} className="btn btn-gold btn-sm">
                      Open tab
                    </Link>
                  ) : (
                    <Link href={`/jobs/${row.jobId}/edit`} className="btn btn-ghost btn-sm">
                      Add tab
                    </Link>
                  )}
                  <Link href={`/jobs/${row.jobId}`} className="btn btn-ghost btn-sm">
                    Job
                  </Link>
                </div>
              </article>
            ))}
          </div>
          )}
          </>
        )
      ) : runs.length === 0 ? (
        <div className="card p-8 text-ink-dim">
          {selectedName ?? "This job"} has a Responses tab, but no body is stored yet. Run it once.
        </div>
      ) : (
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-gold">Job tab</p>
              <h2 className="mt-1 font-display text-2xl">{selectedName}</h2>
            </div>
            <label className="block sm:min-w-64">
              <span className="field-label">Captured run</span>
              <select
                className="field"
                value={selectedRun?.id ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  setRunId(next);
                  const index = runs.findIndex((run) => run.id === next);
                  setCompareId(index >= 0 ? (runs[index + 1]?.id ?? "") : "");
                }}
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {new Date(run.startedAt).toISOString().replace("T", " ").slice(0, 19)} ·{" "}
                    {run.status.toLowerCase()}
                    {run.httpStatus != null ? ` · ${run.httpStatus}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:min-w-64">
              <span className="field-label">Compare with</span>
              <select
                className="field"
                value={compareRun?.id ?? ""}
                onChange={(event) => setCompareId(event.target.value)}
              >
                <option value="">Previous capture</option>
                {runs
                  .filter((run) => run.id !== selectedRun?.id)
                  .map((run) => (
                    <option key={run.id} value={run.id}>
                      {new Date(run.startedAt).toISOString().replace("T", " ").slice(0, 19)} ·{" "}
                      {run.status.toLowerCase()}
                      {run.httpStatus != null ? ` · ${run.httpStatus}` : ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {selectedRun?.error ? <p className="mt-4 text-sm text-rose">{selectedRun.error}</p> : null}
          <p className="mt-3 text-xs text-ink-dim">
            <RelativeTime value={selectedRun?.startedAt} timeZone={timezone} />
            {selectedRun?.responseCharset ? ` · decoded as ${selectedRun.responseCharset}` : ""}
          </p>
          <div className="mt-5 space-y-4">
            <ResponseGridView
              key={`${selectedId}-${selectedRun.id}`}
              grid={grid}
              raw={selectedRun?.responseBody}
              previousRaw={compareRun?.responseBody}
              storageKey={selectedId ?? "responses"}
              jobId={selectedId ?? undefined}
              savedViews={tabs.find((tab) => tab.id === selectedId)?.gridViews}
              savedWatches={tabs.find((tab) => tab.id === selectedId)?.gridWatches}
            />
          </div>
        </div>
      )}
    </div>
  );
}
