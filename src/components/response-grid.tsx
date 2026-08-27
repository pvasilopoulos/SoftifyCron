"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/components/toaster";
import {
  applyGridQuery,
  distinctValues,
  FILTER_OP_LABELS,
  FILTER_OPS,
  filterChipLabel,
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
import { parseGridWatches, type GridWatch } from "@/lib/grid-watch";
import {
  autosizeColumn,
  autosizeColumns,
  clampColWidth,
  columnLooksNumeric,
  highlightParts,
  moveColumnTo,
  stepGridCell,
} from "@/lib/grid-layout";
import {
  deleteJobViewRequest,
  deleteJobWatchRequest,
  saveJobViewRequest,
  saveJobWatchRequest,
} from "@/lib/job-client";

type Panel = "columns" | "filters" | "view" | null;
type Prefs = {
  visible?: string[];
  freeze?: boolean;
  compact?: boolean;
  wrap?: boolean;
  pageSize?: number;
  widths?: Record<string, number>;
  striped?: boolean;
};

function lockCol(width: number): CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}

const CHECK_COL_W = 42;
const INDEX_COL_W = 64;
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

function CellText({ value, query }: { value: string; query: string }) {
  if (!value) return "—";
  if (!query.trim()) return value;
  return highlightParts(value, query).map((part, index) =>
    part.hit ? (
      <mark key={index} className="grid-hit">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

export function ResponseGridView({
  grid,
  raw,
  previousRaw,
  storageKey = "response",
  jobId,
  savedViews,
  savedWatches,
}: {
  grid: ResponseGrid;
  raw?: string | null;
  previousRaw?: string | null;
  storageKey?: string;
  jobId?: string;
  savedViews?: unknown;
  savedWatches?: unknown;
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
  const [diffOn, setDiffOn] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [views, setViews] = useState<GridView[]>(() => parseGridViews(savedViews));
  const [watches, setWatches] = useState<GridWatch[]>(() => parseGridWatches(savedWatches));
  const [watchDraft, setWatchDraft] = useState({ column: "", op: "contains" as FilterOp, value: "" });
  const [hover, setHover] = useState<{ prev: string; next: string; x: number; y: number } | null>(null);
  const [liveWidths, setLiveWidths] = useState<Record<string, number> | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<{ column: string; x: number; y: number } | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [focusCol, setFocusCol] = useState<string | null>(null);
  const [colQuery, setColQuery] = useState("");
  const resizeRef = useRef<{
    column: string;
    startX: number;
    startW: number;
    active: boolean;
  } | null>(null);
  const dragCol = useRef<string | null>(null);
  const lastChecked = useRef<number | null>(null);
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
      const target = event.target as HTMLElement | null;
      if (target?.closest(".grid-col-menu")) return;
      if (!root.current?.contains(target)) {
        setPanel(null);
        setHeaderMenu(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (headerMenu) {
          setHeaderMenu(null);
          return;
        }
        if (panel) {
          setPanel(null);
          return;
        }
        setFullscreen(false);
      }
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
  }, [headerMenu, panel]);

  useEffect(() => {
    if (!fullscreen) return;
    document.documentElement.classList.add("is-grid-full");
    const id = window.requestAnimationFrame(() => {
      root.current?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(id);
      document.documentElement.classList.remove("is-grid-full");
    };
  }, [fullscreen]);

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
  const widths = liveWidths ?? prefs.widths ?? {};
  const striped = prefs.striped !== false;
  const sized = Object.keys(widths).length > 0;
  const numericCols = useMemo(() => {
    const set = new Set<string>();
    for (let index = 0; index < view.columns.length; index += 1) {
      const name = view.columns[index]!;
      const cells = view.rows.slice(0, 40).map((row) => row[index] ?? "");
      if (columnLooksNumeric(cells)) set.add(name);
    }
    return set;
  }, [view.columns, view.rows]);

  useEffect(() => {
    function move(event: MouseEvent) {
      const current = resizeRef.current;
      if (!current) return;
      const dx = event.clientX - current.startX;
      if (!current.active) {
        if (Math.abs(dx) < 4) return;
        current.active = true;
        document.body.classList.add("is-col-resizing");
      }
      event.preventDefault();
      const next = clampColWidth(current.startW + dx);
      setLiveWidths((prev) => ({ ...(prev ?? {}), [current.column]: next }));
    }
    function up() {
      const current = resizeRef.current;
      if (!current) return;
      const wasActive = current.active;
      resizeRef.current = null;
      document.body.classList.remove("is-col-resizing");
      if (!wasActive) return;
      setLiveWidths((prev) => {
        if (prev && Object.keys(prev).length) {
          const raw = prefsSnapshot(storageKey);
          const stored = parsePrefs(raw);
          localStorage.setItem(`sc-grid:${storageKey}`, JSON.stringify({ ...stored, widths: prev }));
          emitPrefs(storageKey);
        }
        return null;
      });
    }
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
  }, [storageKey]);

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

  function colStyle(column: string): CSSProperties | undefined {
    const width = widths[column];
    if (!width) return undefined;
    return { width, minWidth: width, maxWidth: width };
  }

  function startResize(column: string, event: ReactMouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();
    const th = event.currentTarget.closest("th");
    const startW = widths[column] ?? th?.getBoundingClientRect().width ?? 160;
    resizeRef.current = { column, startX: event.clientX, startW, active: false };
    setHeaderMenu(null);
    setFocusCol(column);
  }

  function fitColumn(column: string) {
    const index = source.columns.indexOf(column);
    const cells =
      index >= 0 ? working.grid.rows.slice(0, 80).map((row) => row[index] ?? "") : [];
    patchPrefs({ widths: { ...widths, [column]: autosizeColumn(column, cells) } });
  }

  function fitAllColumns() {
    patchPrefs({
      widths: autosizeColumns(
        view.columns,
        view.rows.slice(0, 80),
      ),
    });
  }

  function resetWidths() {
    patchPrefs({ widths: undefined });
  }

  function fitFocusedColumn() {
    const column =
      (focusCol && view.columns.includes(focusCol) ? focusCol : null) ?? view.columns[0];
    if (column) fitColumn(column);
  }

  function togglePanel(next: Exclude<Panel, null>) {
    setPanel((current) => (current === next ? null : next));
    setHeaderMenu(null);
  }

  function toggleRow(abs: number, shift: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (shift && lastChecked.current != null) {
        const from = Math.min(lastChecked.current, abs);
        const to = Math.max(lastChecked.current, abs);
        for (let index = from; index <= to; index += 1) next.add(index);
      } else if (next.has(abs)) {
        next.delete(abs);
      } else {
        next.add(abs);
      }
      lastChecked.current = abs;
      return next;
    });
  }

  function openHeaderMenu(column: string, event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setHeaderMenu({ column, x: event.clientX, y: event.clientY });
    setFocusCol(column);
    setPanel(null);
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
      widths: item.widths,
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
        widths: prefs.widths,
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

  async function addWatch() {
    if (!jobId) return;
    const column = watchDraft.column || source.columns[0] || "";
    if (!column) return;
    try {
      const data = await saveJobWatchRequest(jobId, {
        column,
        op: watchDraft.op,
        value: watchDraft.value,
      });
      setWatches(parseGridWatches(data.job?.gridWatches));
      setWatchDraft({ column, op: watchDraft.op, value: "" });
      toast("Watch saved");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save watch", "err");
    }
  }

  async function removeWatch(item: GridWatch) {
    if (!jobId) return;
    try {
      const data = await deleteJobWatchRequest(jobId, item.id);
      setWatches(parseGridWatches(data.job?.gridWatches));
      toast("Watch deleted");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete watch", "err");
    }
  }

  const shell = (
    <div
      className={`grid-shell ${fullscreen ? "is-full" : ""}`}
      ref={root}
      tabIndex={0}
      onKeyDown={(event) => {
        const target = event.target;
        const typing =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement;
        if (typing) return;
        const meta = event.ctrlKey || event.metaKey;
        if (meta && event.key.toLowerCase() === "c") {
          if (selected.size > 0) {
            event.preventDefault();
            copyText(gridToTsv({ ...view, rows: selectedRows }), selected.size === 1 ? "Row" : "Rows");
            return;
          }
          if (activeCell) {
            const value = pageRows[activeCell.row - pageOffset]?.[activeCell.col];
            if (value != null) {
              event.preventDefault();
              copyText(value, view.columns[activeCell.col] ?? "Cell");
            }
          }
          return;
        }
        if (mode !== "grid" || view.columns.length === 0 || view.rows.length === 0) return;
        if (target instanceof HTMLElement && target.closest("button, a, .grid-toolbar, .grid-tools, .grid-chips, .grid-pager, .grid-panel, .menu-pop")) {
          return;
        }
        const key = event.key;
        const step =
          key === "ArrowLeft"
            ? "left"
            : key === "ArrowRight" || key === "Tab"
              ? event.shiftKey && key === "Tab"
                ? "left"
                : "right"
              : key === "ArrowUp"
                ? "up"
                : key === "ArrowDown" || key === "Enter"
                  ? "down"
                  : key === "Home"
                    ? meta
                      ? "first"
                      : "home"
                    : key === "End"
                      ? meta
                        ? "last"
                        : "end"
                      : null;
        if (!step) return;
        event.preventDefault();
        const current = activeCell ?? { row: pageOffset, col: 0 };
        const next = stepGridCell(current.row, current.col, step, view.columns.length, view.rows.length);
        if (pageSize > 0) {
          const targetPage = Math.floor(next.row / pageSize) + 1;
          if (targetPage !== safePage) setPage(targetPage);
        }
        setActiveCell(next);
      }}
    >
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
              aria-keyshortcuts="/"
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
        <div className="grid-toolbar-aside">
          <div className="grid-seg" role="tablist" aria-label="Response view">
            <button
              className={mode === "grid" ? "is-on" : ""}
              type="button"
              role="tab"
              aria-selected={mode === "grid"}
              onClick={() => setMode("grid")}
            >
              Grid
            </button>
            {raw ? (
              <>
                <button
                  className={mode === "json" ? "is-on" : ""}
                  type="button"
                  role="tab"
                  aria-selected={mode === "json"}
                  onClick={() => setMode("json")}
                >
                  JSON
                </button>
                <button
                  className={mode === "raw" ? "is-on" : ""}
                  type="button"
                  role="tab"
                  aria-selected={mode === "raw"}
                  onClick={() => setMode("raw")}
                >
                  Raw
                </button>
              </>
            ) : null}
          </div>
          {previousRaw ? (
            <button
              className={`grid-tool ${diffOn ? "is-on" : ""}`}
              type="button"
              aria-pressed={diffOn}
              onClick={() => {
                setDiffOn((value) => !value);
                setPage(1);
                setHover(null);
              }}
            >
              Diff{diff ? ` ${diff.changedCount}` : ""}
            </button>
          ) : null}
          <button
            className={`grid-tool ${fullscreen ? "is-on" : ""}`}
            type="button"
            aria-pressed={fullscreen}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? "Exit full" : "Full screen"}
          </button>
        </div>
      </div>

      {mode === "grid" ? (
        <div className="grid-tools">
          <div className="grid-tools-group" role="group" aria-label="Options and filters">
            <span className="grid-tools-label">Options</span>
            <button
              className={`grid-tool ${panel === "columns" ? "is-on" : ""}`}
              type="button"
              aria-expanded={panel === "columns"}
              onClick={() => togglePanel("columns")}
            >
              Columns
              {source.columns.length !== visible.length
                ? ` ${visible.length}/${source.columns.length}`
                : ""}
            </button>
            <button
              className={`grid-tool ${panel === "filters" || filters.length ? "is-on" : ""}`}
              type="button"
              aria-expanded={panel === "filters"}
              onClick={() => togglePanel("filters")}
            >
              Filters{filters.length ? ` ${filters.length}` : ""}
            </button>
            <button
              className={`grid-tool ${panel === "view" ? "is-on" : ""}`}
              type="button"
              aria-expanded={panel === "view"}
              onClick={() => togglePanel("view")}
            >
              Views
            </button>
          </div>
          <div className="grid-tools-group" role="group" aria-label="Column size">
            <span className="grid-tools-label">Size</span>
            <button
              className="grid-tool"
              type="button"
              title="Autosize the focused column"
              onClick={fitFocusedColumn}
            >
              {focusCol && view.columns.includes(focusCol) ? `Fit ${focusCol}` : "Fit column"}
            </button>
            <button
              className="grid-tool is-accent"
              type="button"
              title="Autosize every visible column from its contents"
              onClick={fitAllColumns}
            >
              Fit all
            </button>
            <button
              className="grid-tool"
              type="button"
              disabled={!sized}
              title="Clear saved column widths"
              onClick={resetWidths}
            >
              Reset
            </button>
          </div>
          <div className="grid-tools-group" role="group" aria-label="Display">
            <span className="grid-tools-label">Display</span>
            <button
              className={`grid-tool ${prefs.freeze ? "is-on" : ""}`}
              type="button"
              aria-pressed={Boolean(prefs.freeze)}
              onClick={() => patchPrefs({ freeze: !prefs.freeze })}
            >
              Pin first
            </button>
            <button
              className={`grid-tool ${prefs.compact ? "is-on" : ""}`}
              type="button"
              aria-pressed={Boolean(prefs.compact)}
              onClick={() => patchPrefs({ compact: !prefs.compact })}
            >
              Compact
            </button>
            <button
              className={`grid-tool ${prefs.wrap !== false ? "is-on" : ""}`}
              type="button"
              aria-pressed={prefs.wrap !== false}
              onClick={() => patchPrefs({ wrap: prefs.wrap === false })}
            >
              Wrap
            </button>
            <button
              className={`grid-tool ${striped ? "is-on" : ""}`}
              type="button"
              aria-pressed={striped}
              onClick={() => patchPrefs({ striped: !striped })}
            >
              Stripes
            </button>
          </div>
        </div>
      ) : null}

      {filters.length ? (
        <div className="grid-chips" aria-label="Active filters">
          {filters.map((filter) => (
            <div key={filter.id} className="grid-chip">
              <button
                className="grid-chip-label"
                type="button"
                title="Edit filter"
                onClick={() => togglePanel("filters")}
              >
                <span className="truncate">{filterChipLabel(filter)}</span>
              </button>
              <button
                className="grid-chip-x"
                type="button"
                aria-label={`Remove ${filterChipLabel(filter)}`}
                onClick={() => {
                  setFilters((current) => current.filter((item) => item.id !== filter.id));
                  setPage(1);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="grid-chip-clear"
            type="button"
            onClick={() => {
              setFilters([]);
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : null}

      <p className="grid-meta">
        {source.title ? `${source.title} · ` : ""}
        {view.rows.length.toLocaleString()} of {source.rows.length.toLocaleString()} rows ·{" "}
        {view.columns.length} columns · {source.source.replace("-", " ")}
        {selected.size ? ` · ${selected.size} selected` : ""}
        {diff ? ` · ${diff.changedCount} cells changed vs previous run` : ""}
        {diffActive ? " · showing changes only" : ""}
        {sized ? " · custom column widths" : ""}
      </p>

      {panel === "columns" ? (
        <div className="grid-panel">
          <div className="grid-panel-head">
            <div>
              <p className="grid-panel-title">Columns</p>
              <p className="grid-panel-sub">
                {visible.length} visible · {source.columns.length - visible.length} hidden · drag a header to reorder
              </p>
            </div>
            <button className="grid-tool" type="button" onClick={() => setPanel(null)} aria-label="Close columns">
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="field grid-col-search"
              value={colQuery}
              onChange={(event) => setColQuery(event.target.value)}
              placeholder="Find a column…"
              aria-label="Find a column"
            />
            <button className="grid-tool" type="button" onClick={() => patchPrefs({ visible: source.columns })}>
              Show all
            </button>
            <button
              className="grid-tool"
              type="button"
              onClick={() => patchPrefs({ visible: source.columns.slice(0, 1) })}
            >
              First only
            </button>
            <button className="grid-tool" type="button" onClick={() => patchPrefs({ visible: undefined })}>
              Reset order
            </button>
            <button className="grid-tool is-accent" type="button" onClick={fitAllColumns}>
              Fit all
            </button>
            <button className="grid-tool" type="button" disabled={!sized} onClick={resetWidths}>
              Reset widths
            </button>
          </div>
          <ul className="grid-col-list">
            {source.columns
              .filter((column) => !colQuery.trim() || column.toLowerCase().includes(colQuery.trim().toLowerCase()))
              .map((column) => (
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
                  <button type="button" onClick={() => { fitColumn(column); setFocusCol(column); }} title={`Fit ${column}`}>
                    Fit
                  </button>
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
          <div className="grid-panel-head">
            <div>
              <p className="grid-panel-title">Filters</p>
              <p className="grid-panel-sub">Narrow the table by column. Active filters stay as chips above the grid.</p>
            </div>
            <button className="grid-tool" type="button" onClick={() => setPanel(null)} aria-label="Close filters">
              Close
            </button>
          </div>
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
          <div className="grid-panel-head">
            <div>
              <p className="grid-panel-title">Views and export</p>
              <p className="grid-panel-sub">Pin, density, and wrap are also on the toolbar. Save a layout or export the current table.</p>
            </div>
            <button className="grid-tool" type="button" onClick={() => setPanel(null)} aria-label="Close views">
              Close
            </button>
          </div>
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
          <label className="grid-check">
            <input
              type="checkbox"
              checked={striped}
              onChange={(event) => patchPrefs({ striped: event.target.checked })}
            />
            Striped rows
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="grid-tool is-accent" type="button" onClick={fitAllColumns}>
              Fit all
            </button>
            <button className="grid-tool" type="button" disabled={!sized} onClick={resetWidths}>
              Reset widths
            </button>
          </div>
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
              <div className="space-y-2 pt-2">
                <p className="text-xs uppercase tracking-[0.14em] text-ink-dim">Grid watches</p>
                <p className="text-xs text-ink-dim">Alert when a cell matches after a run.</p>
                {watches.length === 0 ? <p className="text-sm text-ink-dim">None yet.</p> : null}
                <ul className="space-y-2">
                  {watches.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="mono">
                        {item.column} {item.op} {item.value || "∅"}
                      </span>
                      <button className="text-xs text-rose" type="button" onClick={() => removeWatch(item)}>
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="field w-auto min-w-28"
                    value={watchDraft.column || source.columns[0] || ""}
                    onChange={(event) => setWatchDraft((current) => ({ ...current, column: event.target.value }))}
                  >
                    {source.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field w-auto"
                    value={watchDraft.op}
                    onChange={(event) =>
                      setWatchDraft((current) => ({ ...current, op: event.target.value as FilterOp }))
                    }
                  >
                    {FILTER_OPS.map((op) => (
                      <option key={op} value={op}>
                        {FILTER_OP_LABELS[op]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field w-auto min-w-28"
                    value={watchDraft.value}
                    onChange={(event) => setWatchDraft((current) => ({ ...current, value: event.target.value }))}
                    placeholder="Value"
                  />
                  <button className="btn btn-gold btn-sm" type="button" onClick={addWatch}>
                    Add watch
                  </button>
                </div>
              </div>
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
        <div className="space-y-3">
          <p className="text-sm text-ink-dim">No cells changed vs the previous run.</p>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setDiffOn(false)}>
            Show all rows
          </button>
        </div>
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
          <div className={`grid gap-3 ${fullscreen ? "hidden" : "md:hidden"}`}>
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
                            {row[col] ? <CellText value={row[col] ?? ""} query={query} /> : "—"}
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
          <div className={`grid-table-wrap ${fullscreen ? "" : "hidden md:block"} ${prefs.compact ? "is-compact" : ""}`}>
            <table
              className={`data-grid ${prefs.freeze ? "is-freeze" : ""} ${prefs.wrap === false ? "is-clip" : ""} ${prefs.compact ? "is-compact" : ""} ${sized ? "is-sized" : ""} ${striped ? "is-striped" : ""}`}
            >
              <thead>
                <tr>
                  <th className="grid-check-col" style={lockCol(CHECK_COL_W)}>
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
                  <th className="grid-index-col" style={lockCol(INDEX_COL_W)}>#</th>
                  {view.columns.map((column) => (
                    <th
                      key={column}
                      className={`grid-th ${numericCols.has(column) ? "is-num" : ""} ${focusCol === column ? "is-focus" : ""}`}
                      style={colStyle(column)}
                      onContextMenu={(event) => openHeaderMenu(column, event)}
                      onDoubleClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest(".grid-sort, .grid-th-more")) return;
                        event.preventDefault();
                        event.stopPropagation();
                        setFocusCol(column);
                        fitColumn(column);
                      }}
                      onDragOver={(event) => {
                        if (!dragCol.current) return;
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const from = dragCol.current;
                        dragCol.current = null;
                        if (!from || from === column) return;
                        patchPrefs({ visible: moveColumnTo(visible, from, visible.indexOf(column)) });
                      }}
                    >
                      <div className="grid-th-inner">
                        <button
                          type="button"
                          className="grid-sort"
                          title={column}
                          draggable
                          onDragStart={() => {
                            dragCol.current = column;
                          }}
                          onDragEnd={() => {
                            dragCol.current = null;
                          }}
                          onClick={() => {
                            setFocusCol(column);
                            toggleSort(column);
                          }}
                        >
                          <span className="grid-th-name">{column}</span>
                          {sort?.column === column ? (
                            <span className="grid-th-dir" aria-hidden>
                              {sort.dir === "asc" ? "↑" : "↓"}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="grid-th-more"
                          aria-label={`Column menu ${column}`}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            if (event.detail > 1) return;
                            openHeaderMenu(column, event);
                          }}
                        >
                          ⋮
                        </button>
                        <span
                          className="grid-col-resizer"
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${column}`}
                          onMouseDown={(event) => startResize(column, event)}
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setFocusCol(column);
                            fitColumn(column);
                          }}
                          title="Drag to resize · double-click to autosize"
                        />
                      </div>
                      <span
                        className="grid-col-edge"
                        onMouseDown={(event) => startResize(column, event)}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setFocusCol(column);
                          fitColumn(column);
                        }}
                        title="Drag to resize · double-click to autosize"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const abs = pageOffset + index;
                  return (
                    <tr key={abs} className={selected.has(abs) ? "is-selected" : ""}>
                      <td className="grid-check-col" style={lockCol(CHECK_COL_W)}>
                        <input
                          type="checkbox"
                          checked={selected.has(abs)}
                          onChange={(event) => toggleRow(abs, event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)}
                          aria-label={`Select row ${sourceIndex(abs) + 1}`}
                        />
                      </td>
                      <td className="grid-index-col" style={lockCol(INDEX_COL_W)}>{sourceIndex(abs) + 1}</td>
                      {row.map((value, col) => {
                        const cell = cellDiff(abs, col);
                        const changed = Boolean(cell?.changed);
                        const column = view.columns[col] ?? "";
                        const isActive = activeCell?.row === abs && activeCell.col === col;
                        return (
                        <td
                          key={col}
                          style={colStyle(column)}
                          aria-label={cell?.changed ? diffHoverText(cell) : undefined}
                          className={[
                            changed ? "is-changed" : diffActive ? "is-same" : "",
                            numericCols.has(column) ? "is-num" : "",
                            isActive ? "is-active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onMouseOver={
                            changed && cell ? (event) => showTip(event, cell.previous, cell.value) : undefined
                          }
                          onMouseMove={
                            changed && cell ? (event) => showTip(event, cell.previous, cell.value) : undefined
                          }
                          onMouseLeave={() => setHover(null)}
                          onClick={() => {
                            setActiveCell({ row: abs, col });
                            setFocusCol(column);
                          }}
                          onDoubleClick={() => copyText(value, column || "Cell")}
                        >
                          <CellText value={value} query={query} />
                          {changed && cell ? (
                            <span className="grid-cell-tip">
                              <span className="grid-hover-k">Was</span>
                              <span className="grid-hover-v">{cell.previous || "—"}</span>
                              <span className="grid-hover-k">Now</span>
                              <span className="grid-hover-v">{cell.value || "—"}</span>
                            </span>
                          ) : null}
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
            <label className="grid-page-size">
              Go
              <input
                className="field"
                type="number"
                min={1}
                max={totalPages}
                value={safePage}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setPage(Math.min(totalPages, Math.max(1, Math.trunc(next))));
                }}
              />
            </label>
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
      {headerMenu
        ? createPortal(
            <div
              className="menu-pop grid-col-menu"
              style={{
                position: "fixed",
                left: Math.min(headerMenu.x, window.innerWidth - 180),
                top: Math.min(headerMenu.y + 8, window.innerHeight - 320),
                right: "auto",
                marginTop: 0,
              }}
            >
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  setSort({ column: headerMenu.column, dir: "asc" });
                  setHeaderMenu(null);
                  setPage(1);
                }}
              >
                Sort A → Z
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  setSort({ column: headerMenu.column, dir: "desc" });
                  setHeaderMenu(null);
                  setPage(1);
                }}
              >
                Sort Z → A
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  fitColumn(headerMenu.column);
                  setFocusCol(headerMenu.column);
                  setHeaderMenu(null);
                }}
              >
                Fit this column
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  fitAllColumns();
                  setHeaderMenu(null);
                }}
              >
                Fit all columns
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  const next = { ...widths };
                  delete next[headerMenu.column];
                  patchPrefs({ widths: Object.keys(next).length ? next : undefined });
                  setHeaderMenu(null);
                }}
              >
                Reset width
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  const index = view.columns.indexOf(headerMenu.column);
                  if (index >= 0) {
                    copyText(
                      view.rows.map((row) => row[index] ?? "").join("\n"),
                      headerMenu.column,
                    );
                  }
                  setHeaderMenu(null);
                }}
              >
                Copy column
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  patchPrefs({
                    visible: moveColumnTo(visible, headerMenu.column, 0),
                    freeze: true,
                  });
                  setHeaderMenu(null);
                }}
              >
                Pin left
              </button>
              <button
                className="menu-item"
                type="button"
                onClick={() => {
                  setFilters((current) => [
                    ...current,
                    {
                      id: `f-${Date.now()}`,
                      column: headerMenu.column,
                      op: "contains",
                      value: "",
                    },
                  ]);
                  setPanel("filters");
                  setHeaderMenu(null);
                }}
              >
                Filter…
              </button>
              <div className="menu-sep" />
              <button
                className="menu-item is-danger"
                type="button"
                onClick={() => {
                  toggleColumn(headerMenu.column);
                  setHeaderMenu(null);
                }}
              >
                Hide column
              </button>
            </div>,
            document.body,
          )
        : null}
      {hover
        ? createPortal(
            <div
              className="grid-hover-tip"
              style={{
                left: Math.min(hover.x + 16, window.innerWidth - 240),
                top: Math.min(hover.y + 18, window.innerHeight - 140),
              }}
            >
              <p className="grid-hover-k">Was</p>
              <p className="grid-hover-v">{hover.prev}</p>
              <p className="grid-hover-k">Now</p>
              <p className="grid-hover-v">{hover.next}</p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );

  if (!fullscreen) return shell;
  return (
    <>
      <div className="grid-full-ph" aria-hidden />
      {createPortal(<div className="grid-full-root">{shell}</div>, document.body)}
    </>
  );
}
