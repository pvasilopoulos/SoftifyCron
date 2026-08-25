"use client";

import { useMemo, useState } from "react";
import { filterGrid, type ResponseGrid } from "@/lib/response-grid";

export function ResponseGridView({
  grid,
  raw,
}: {
  grid: ResponseGrid;
  raw?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"grid" | "raw">("grid");
  const filtered = useMemo(() => filterGrid(grid, query), [grid, query]);
  const isPairs = grid.source === "json-pairs" && grid.columns.length === 2;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">
          {grid.title ? `${grid.title} · ` : ""}
          {filtered.rows.length} row{filtered.rows.length === 1 ? "" : "s"} · {grid.source.replace("-", " ")}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="field sm:max-w-56"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter rows…"
            aria-label="Filter response rows"
          />
          {raw ? (
            <button
              className={`btn ${mode === "raw" ? "btn-gold" : "btn-ghost"}`}
              type="button"
              onClick={() => setMode((current) => (current === "grid" ? "raw" : "grid"))}
            >
              {mode === "raw" ? "Grid" : "Raw"}
            </button>
          ) : null}
        </div>
      </div>

      {mode === "raw" && raw ? (
        <pre className="mono max-h-[70vh] overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-bg p-4 text-xs text-gold-2">
          {raw}
        </pre>
      ) : filtered.columns.length === 0 ? (
        <p className="text-sm text-ink-dim">Empty payload.</p>
      ) : isPairs ? (
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {filtered.rows.map((row, index) => (
            <div key={`${row[0]}-${index}`} className="grid gap-px bg-line sm:grid-cols-[minmax(7rem,14rem)_minmax(0,1fr)]">
              <dt className="bg-bg-mute px-4 py-3 text-xs uppercase tracking-[0.12em] text-ink-dim">
                {row[0]}
              </dt>
              <dd className="break-any bg-bg-elev px-4 py-3 text-sm">{row[1] || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filtered.rows.map((row, index) => (
              <article key={index} className="rounded-2xl border border-line bg-bg p-4">
                <dl className="space-y-2 text-sm">
                  {grid.columns.map((column, col) => (
                    <div key={column}>
                      <dt className="text-xs uppercase tracking-[0.12em] text-ink-dim">{column}</dt>
                      <dd className="break-any mt-0.5">{row[col] || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <div className="table-wrap hidden md:block">
            <table className="data-grid">
              <thead>
                <tr>
                  {filtered.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, col) => (
                      <td key={col}>{cell || "—"}</td>
                    ))}
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
