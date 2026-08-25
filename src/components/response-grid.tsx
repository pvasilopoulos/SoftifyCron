"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "@/components/toaster";
import {
  applyGridQuery,
  distinctValues,
  FILTER_OP_LABELS,
  FILTER_OPS,
  gridToCsv,
  gridToTsv,
  moveColumn,
  parseResponseDatasets,
  reconcileVisible,
  rowsAsObjects,
  type ColumnFilter,
  type FilterOp,
  type ResponseGrid,
  type SortState,
} from "@/lib/response-grid";
import { changedSourceRows, diffGrids, diffHoverText } from "@/lib/grid-diff";
import { jsonLineDiff, prettyJsonText } from "@/lib/json-diff";
import { parseGridViews, type GridView } from "@/lib/grid-views";
import { deleteJobViewRequest, saveJobViewRequest } from "@/lib/job-client";

type Panel = "columns" | "filters" | "view" | null;
type Prefs = {
  visible?: string[];
  freeze?: boolean;
  compact?: boolean;
  wrap?: boolean;
  pageSize?: number;
};

const PAGE_SIZES = [25, 50, 100, 250, 500, 0];

const prefsListeners = new Map<string, Set<() => void>>();

function emitPrefs(key: string) {
  prefsListeners.get(key)?.forEach((listener) => listener());
}

function subscribePrefs(key: string) {
  return (onStoreChange: () => void) => {
    const bucket = prefsListeners.get(key) ?? new Set<() => void>();
    bucket.add(onStoreChange);
    prefsListeners.set(key, bucket);
    return () => {
      bucket.delete(onStoreChange);
    };
  };
}

function prefsSnapshot(key: string) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`sc-grid:${key}`) ?? "";
}

function parsePrefs(raw: string): Prefs {
  try {
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
}

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function ResponseGridView({
  grid,
  raw,
  previousRaw,
  storageKey = "response",
  jobId,
  savedViews,
}: {
  grid: ResponseGrid;
  raw?: string | null;
  previousRaw?: string | null;
  storageKey?: string;
  jobId?: string;
  savedViews?: unknown;
}) {
  const datasets = useMemo(
    () => (raw ? parseResponseDatasets(raw) : [{ id: "grid", name: grid.title || "Grid", grid }]),
    [grid, raw],
  );
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "grid");
  const active = datasets.find((item) => item.id === datasetId) ?? datasets[0]!;
  const source = active.grid;

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"grid" | "json" | "raw">("grid");
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [page, setPage] = useState(1);
  const [diffOn, setDiffOn] = useState(Boolean(previousRaw));
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [views, setViews] = useState<GridView[]>(() => parseGridViews(savedViews));
  const [hover, setHover] = useState<{ prev: string; next: string; x: number; y: number } | null>(null);
  const jsonDiff = useMemo(
    () => (raw && previousRaw && diffOn ? jsonLineDiff(raw, previousRaw) : null),
    [raw, previousRaw, diffOn],
  );
  const previousGrid = useMemo(() => {
    if (!previousRaw) return null;
    const prevSets = parseResponseDatasets(previousRaw);
    return prevSets.find((item) => item.id === active.id)?.grid ?? prevSets[0]?.grid ?? null;
  }, [previousRaw, active.id]);
  const diff = useMemo(
    () => (previousGrid ? diffGrids(source, previousGrid) : null),
    [previousGrid, source],
  );
  const working = useMemo(
    () => (diffOn && diff ? changedSourceRows(source, diff) : { grid: source, origin: source.rows.map((_, index) => index) }),
    [diffOn, diff, source],
  );
  const subscribe = useMemo(() => subscribePrefs(storageKey), [storageKey]);
  const prefsRaw = useSyncExternalStore(subscribe, () => prefsSnapshot(storageKey), () => "");
  const prefs = useMemo(() => parsePrefs(prefsRaw), [prefsRaw]);
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
      if (event.key === "/" && event.target === document.body) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const visible = useMemo(
    () => reconcileVisible(prefs.visible, source.columns),
    [prefs.visible, source.columns],
  );
  const view = useMemo(
    () => applyGridQuery(working.grid, { query, filters, sort, visible }),
    [working.grid, query, filters, sort, visible],
  );
  const pageSize = prefs.pageSize ?? 50;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(view.rows.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages);
  const pageRows =
    pageSize > 0
      ? view.rows.slice((safePage - 1) * pageSize, safePage * pageSize)
      : view.rows;
  const pageOffset = pageSize > 0 ? (safePage - 1) * pageSize : 0;
  const isPairs = view.source === "json-pairs" && view.columns.length === 2;
  const diffActive = Boolean(diffOn && diff);

  function sourceIndex(viewRow: number) {
    const workingIndex = view.origin[viewRow] ?? viewRow;
    return working.origin[workingIndex] ?? workingIndex;
  }

  function cellDiff(viewRow: number, viewCol: number) {
    if (!diff) return null;
    const origCol = source.columns.indexOf(view.columns[viewCol] ?? "");
    if (origCol < 0) return null;
    return diff.rows[sourceIndex(viewRow)]?.cells[origCol] ?? null;
  }

  function showTip(event: ReactMouseEvent, prev: string, next: string) {
    setHover({ prev: prev || "—", next: next || "—", x: event.clientX, y: event.clientY });
  }

  function patchPrefs(next: Prefs) {
    const merged = { ...prefs, ...next };
    localStorage.setItem(`sc-grid:${storageKey}`, JSON.stringify(merged));
    emitPrefs(storageKey);
  }

  function toggleSort(column: string) {
    setSort((current) => {
      if (current?.column !== column) return { column, dir: "asc" };
      if (current.dir === "asc") return { column, dir: "desc" };
      return null;
    });
    setPage(1);
  }

  function toggleColumn(column: string) {
    const next = visible.includes(column)
      ? visible.filter((item) => item !== column)
      : [...visible, column];
    if (next.length === 0) return;
    patchPrefs({ visible: next });
  }

  function addFilter() {
    setFilters((current) => [
      ...current,
      {
        id: `f-${Date.now()}-${current.length}`,
        column: source.columns[0] ?? "",
        op: "contains",
        value: "",
      },
    ]);
    setPanel("filters");
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => toast(`${label} copied`),
      () => toast("Could not copy", "err"),
    );
  }

  const selectedRows = view.rows.filter((_, index) => selected.has(index));

  function applyView(item: GridView) {
    patchPrefs({
      visible: item.visible,
      freeze: item.freeze,
      compact: item.compact,
      wrap: item.wrap,
      pageSize: item.pageSize,
    });
    toast(`View “${item.name}” applied`);
    setPanel(null);
  }

  async function saveCurrentView() {
    if (!jobId) return;
    const name = prompt("Name this view")?.trim();
    if (!name) return;
    try {
      const data = await saveJobViewRequest(jobId, {
        name,
        visible,
        freeze: prefs.freeze,
        compact: prefs.compact,
        wrap: prefs.wrap,
        pageSize: prefs.pageSize,
      });
      setViews(parseGridViews(data.job?.gridViews));
      toast("View saved");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save view", "err");
    }
  }

  async function removeView(item: GridView) {
    if (!jobId) return;
    if (!confirm(`Delete view “${item.name}”?`)) return;
    try {
      const data = await deleteJobViewRequest(jobId, item.id);
      setViews(parseGridViews(data.job?.gridViews));
      toast("View deleted");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete view", "err");
    }
  }

  return (
    <div className="grid-shell" ref={root}>
      <div className="grid-toolbar">
        <div className="grid-toolbar-main">
          <label className="grid-search">
            <span className="sr-only">Search</span>
            <input
              ref={searchRef}
              className="field"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search all cells…"
            />
          </label>
          {datasets.length > 1 ? (
            <select
              className="field grid-select"
              value={active.id}
              onChange={(event) => {
                setDatasetId(event.target.value);
                setPage(1);
                setSelected(new Set());
              }}
              aria-label="JSON dataset"
            >
              {datasets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="grid-toolbar-actions">
          <button
            className={`btn btn-sm ${panel === "columns" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setPanel((current) => (current === "columns" ? null : "columns"))}
          >
            Columns
          </button>
          <button
            className={`btn btn-sm ${panel === "filters" || filters.length ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setPanel((current) => (current === "filters" ? null : "filters"))}
          >
            Filters{filters.length ? ` ${filters.length}` : ""}
          </button>
          <button
            className={`btn btn-sm ${panel === "view" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setPanel((current) => (current === "view" ? null : "view"))}
          >
            View
          </button>
          <button
            className={`btn btn-sm ${mode === "grid" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setMode("grid")}
          >
            Grid
          </button>
          {raw ? (
            <>
              <button
                className={`btn btn-sm ${mode === "json" ? "btn-gold" : "btn-ghost"}`}
                type="button"
                onClick={() => setMode("json")}
              >
                JSON
              </button>
              <button
                className={`btn btn-sm ${mode === "raw" ? "btn-gold" : "btn-ghost"}`}
                type="button"
                onClick={() => setMode("raw")}
              >
                Raw
              </button>
            </>
          ) : null}
          {previousRaw ? (
            <button
              className={`btn btn-sm ${diffOn ? "btn-gold" : "btn-ghost"}`}
              type="button"
              onClick={() => {
                setDiffOn((value) => !value);
                setPage(1);
                setHover(null);
              }}
            >
              Diff{diff ? ` · ${diff.changedCount}` : ""}
            </button>
          ) : null}
        </div>
      </div>

      <p className="grid-meta">
        {source.title ? `${source.title} · ` : ""}
        {view.rows.length.toLocaleString()} of {source.rows.length.toLocaleString()} rows ·{" "}
        {view.columns.length} cols · {source.source.replace("-", " ")}
        {selected.size ? ` · ${selected.size} selected` : ""}
        {diff ? ` · ${diff.changedCount} cells changed vs previous run` : ""}
        {diffActive ? " · showing changes only" : ""}
      </p>

      {panel === "columns" ? (
        <div className="grid-panel">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => patchPrefs({ visible: source.columns })}>
              Show all
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => patchPrefs({ visible: source.columns.slice(0, 1) })}
            >
              First only
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => patchPrefs({ visible: undefined })}>
              Reset
            </button>
          </div>
          <ul className="grid-col-list">
            {source.columns.map((column) => (
              <li key={column}>
                <label className="grid-check">
                  <input
                    type="checkbox"
                    checked={visible.includes(column)}
                    onChange={() => toggleColumn(column)}
                  />
                  <span className="truncate">{column}</span>
                </label>
                <span className="grid-col-move">
                  <button type="button" onClick={() => patchPrefs({ visible: moveColumn(visible, column, -1) })}>
                    ↑
                  </button>
                  <button type="button" onClick={() => patchPrefs({ visible: moveColumn(visible, column, 1) })}>
                    ↓
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panel === "filters" ? (
        <div className="grid-panel space-y-3">
          {filters.length === 0 ? <p className="text-sm text-ink-dim">No column filters yet.</p> : null}
          {filters.map((filter) => {
            const values = distinctValues(source, filter.column, 40);
            const showList = values.length > 0 && values.length <= 40;
            return (
              <div key={filter.id} className="grid-filter-row">
                <select
                  className="field"
                  value={filter.column}
                  onChange={(event) =>
                    setFilters((current) =>
                      current.map((item) =>
                        item.id === filter.id ? { ...item, column: event.target.value } : item,
                      ),
                    )
                  }
                >
                  {source.columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
                <select
                  className="field"
                  value={filter.op}
                  onChange={(event) =>
                    setFilters((current) =>
                      current.map((item) =>
                        item.id === filter.id ? { ...item, op: event.target.value as FilterOp } : item,
                      ),
                    )
                  }
                >
                  {FILTER_OPS.map((op) => (
                    <option key={op} value={op}>
                      {FILTER_OP_LABELS[op]}
                    </option>
                  ))}
                </select>
                {filter.op === "empty" || filter.op === "notEmpty" ? (
                  <span className="text-sm text-ink-dim">No value needed</span>
                ) : (
                  <input
                    className="field"
                    list={showList ? `${filter.id}-list` : undefined}
                    value={filter.value}
                    onChange={(event) => {
                      setFilters((current) =>
                        current.map((item) =>
                          item.id === filter.id ? { ...item, value: event.target.value } : item,
                        ),
                      );
                      setPage(1);
                    }}
                    placeholder="Value"
                  />
                )}
                {showList ? (
                  <datalist id={`${filter.id}-list`}>
                    {values.map((value) => (
                      <option key={value || "(empty)"} value={value} />
                    ))}
                  </datalist>
                ) : null}
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setFilters((current) => current.filter((item) => item.id !== filter.id))}
                >
                  Remove
                </button>
              </div>
            );
          })}
          <button className="btn btn-gold btn-sm" type="button" onClick={addFilter}>
            Add filter
          </button>
        </div>
      ) : null}

      {panel === "view" ? (
        <div className="grid-panel grid-view-opts">
          <label className="grid-check">
            <input
              type="checkbox"
              checked={Boolean(prefs.freeze)}
              onChange={(event) => patchPrefs({ freeze: event.target.checked })}
            />
            Freeze first column
          </label>
          <label className="grid-check">
            <input
              type="checkbox"
              checked={Boolean(prefs.compact)}
              onChange={(event) => patchPrefs({ compact: event.target.checked })}
            />
            Compact rows
          </label>
          <label className="grid-check">
            <input
              type="checkbox"
              checked={prefs.wrap !== false}
              onChange={(event) => patchPrefs({ wrap: event.target.checked })}
            />
            Wrap cells
          </label>
          {jobId ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">Saved views</p>
              {views.length === 0 ? <p className="text-sm text-ink-dim">None yet for this job.</p> : null}
              <ul className="space-y-2">
                {views.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-2">
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => applyView(item)}>
                      {item.name}
                    </button>
                    <button className="text-xs text-rose" type="button" onClick={() => removeView(item)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
              <button className="btn btn-gold btn-sm" type="button" onClick={saveCurrentView}>
                Save current view
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                download(`${storageKey}.csv`, gridToCsv(view), "text/csv;charset=utf-8");
                toast("CSV downloaded");
              }}
            >
              Export CSV
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => copyText(gridToTsv(selectedRows.length ? { ...view, rows: selectedRows } : view), "Table")}
            >
              Copy TSV
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() =>
                copyText(
                  JSON.stringify(
                    rowsAsObjects(selectedRows.length ? { ...view, rows: selectedRows } : view),
                    null,
                    2,
                  ),
                  "JSON rows",
                )
              }
            >
              Copy JSON
            </button>
          </div>
        </div>
      ) : null}

      {mode === "json" && raw ? (
        jsonDiff ? (
          <div className="grid-json-split">
            <div>
              <p className="grid-json-label">Previous</p>
              <pre className="grid-code">
                {jsonDiff.map((row, index) => (
                  <span key={`l-${index}`} className={`grid-json-line is-${row.kind}`}>
                    {row.left || " "}
                    {"\n"}
                  </span>
                ))}
              </pre>
            </div>
            <div>
              <p className="grid-json-label">Current</p>
              <pre className="grid-code">
                {jsonDiff.map((row, index) => (
                  <span key={`r-${index}`} className={`grid-json-line is-${row.kind}`}>
                    {row.right || " "}
                    {"\n"}
                  </span>
                ))}
              </pre>
            </div>
          </div>
        ) : (
          <pre className="grid-code">{prettyJsonText(raw)}</pre>
        )
      ) : mode === "raw" && raw ? (
        <pre className="grid-code">{raw}</pre>
      ) : view.columns.length === 0 ? (
        <p className="text-sm text-ink-dim">Empty payload.</p>
      ) : diffActive && view.rows.length === 0 ? (
        <p className="text-sm text-ink-dim">No cells changed vs the previous run.</p>
      ) : isPairs ? (
        <dl className="grid-pairs">
          {pageRows.map((row, index) => {
            const abs = pageOffset + index;
            const cell = cellDiff(abs, 1);
            const changed = Boolean(cell?.changed);
            return (
              <div
                key={`${row[0]}-${abs}`}
                className={changed ? "is-changed" : diffActive ? "is-same" : undefined}
                title={cell?.changed ? diffHoverText(cell) : undefined}
                onMouseEnter={changed && cell ? (event) => showTip(event, cell.previous, cell.value) : undefined}
                onMouseMove={changed && cell ? (event) => showTip(event, cell.previous, cell.value) : undefined}
                onMouseLeave={() => setHover(null)}
              >
                <dt>{row[0]}</dt>
                <dd>
                  {row[1] || "—"}
                  {changed && cell ? <span className="grid-was md:hidden">Was {cell.previous || "—"}</span> : null}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {pageRows.map((row, index) => {
              const abs = pageOffset + index;
              return (
                <article
                  key={abs}
                  className={`grid-card ${selected.has(abs) ? "is-on" : ""}`}
                  onClick={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(abs)) next.delete(abs);
                      else next.add(abs);
                      return next;
                    })
                  }
                >
                  <p className="grid-card-index">#{sourceIndex(abs) + 1}</p>
                  <dl>
                    {view.columns.map((column, col) => {
                      const cell = cellDiff(abs, col);
                      const changed = Boolean(cell?.changed);
                      if (diffActive && cell && !changed) return null;
                      return (
                        <div key={column} className={changed ? "is-changed" : undefined}>
                          <dt>{column}</dt>
                          <dd>
                            {row[col] || "—"}
                            {changed && cell ? <span className="grid-was">Was {cell.previous || "—"}</span> : null}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </article>
              );
            })}
          </div>
          <div className={`grid-table-wrap hidden md:block ${prefs.compact ? "is-compact" : ""}`}>
            <table
              className={`data-grid ${prefs.freeze ? "is-freeze" : ""} ${prefs.wrap === false ? "is-clip" : ""} ${prefs.compact ? "is-compact" : ""}`}
            >
              <thead>
                <tr>
                  <th className="grid-check-col">
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every((_, index) => selected.has(pageOffset + index))}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = new Set(current);
                          pageRows.forEach((_, index) => {
                            const abs = pageOffset + index;
                            if (event.target.checked) next.add(abs);
                            else next.delete(abs);
                          });
                          return next;
                        });
                      }}
                      aria-label="Select page"
                    />
                  </th>
                  <th className="grid-index-col">#</th>
                  {view.columns.map((column) => (
                    <th key={column}>
                      <button type="button" className="grid-sort" onClick={() => toggleSort(column)}>
                        {column}
                        {sort?.column === column ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const abs = pageOffset + index;
                  return (
                    <tr key={abs} className={selected.has(abs) ? "is-selected" : ""}>
                      <td className="grid-check-col">
                        <input
                          type="checkbox"
                          checked={selected.has(abs)}
                          onChange={(event) => {
                            setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(abs);
                              else next.delete(abs);
                              return next;
                            });
                          }}
                          aria-label={`Select row ${sourceIndex(abs) + 1}`}
                        />
                      </td>
                      <td className="grid-index-col">{sourceIndex(abs) + 1}</td>
                      {row.map((value, col) => {
                        const cell = cellDiff(abs, col);
                        const changed = Boolean(cell?.changed);
                        return (
                        <td
                          key={col}
                          title={changed ? undefined : value}
                          aria-label={cell?.changed ? diffHoverText(cell) : undefined}
                          className={changed ? "is-changed" : diffActive ? "is-same" : undefined}
                          onMouseEnter={
                            changed && cell ? (event) => showTip(event, cell.previous, cell.value) : undefined
                          }
                          onMouseMove={
                            changed && cell ? (event) => showTip(event, cell.previous, cell.value) : undefined
                          }
                          onMouseLeave={() => setHover(null)}
                          onDoubleClick={() => copyText(value, view.columns[col] ?? "Cell")}
                        >
                          {value || "—"}
                        </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mode === "grid" && view.rows.length > 0 ? (
        <div className="grid-pager">
          <p>
            {pageOffset + 1}–{pageOffset + pageRows.length} of {view.rows.length.toLocaleString()}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="grid-page-size">
              Rows
              <select
                className="field"
                value={pageSize}
                onChange={(event) => {
                  patchPrefs({ pageSize: Number(event.target.value) });
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size === 0 ? "All" : size}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-ghost btn-sm" type="button" disabled={safePage <= 1} onClick={() => setPage(1)}>
              First
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              Prev
            </button>
            <span className="text-sm text-ink-dim">
              {safePage} / {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      ) : null}
      {hover ? (
        <div
          className="grid-hover-tip"
          style={{
            left: Math.min(hover.x + 14, typeof window === "undefined" ? hover.x : window.innerWidth - 260),
            top: Math.min(hover.y + 16, typeof window === "undefined" ? hover.y : window.innerHeight - 130),
          }}
        >
          <p className="grid-hover-k">Was</p>
          <p className="grid-hover-v">{hover.prev}</p>
          <p className="grid-hover-k">Now</p>
          <p className="grid-hover-v">{hover.next}</p>
        </div>
      ) : null}
    </div>
  );
}
