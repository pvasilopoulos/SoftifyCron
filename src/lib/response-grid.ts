export type ResponseGrid = {
  columns: string[];
  rows: string[][];
  source: "json-table" | "json-pairs" | "csv" | "html" | "text";
  title?: string;
};

const MAX_COLS = 200;

export const FILTER_OPS = [
  "contains",
  "equals",
  "not",
  "starts",
  "empty",
  "notEmpty",
  "gt",
  "lt",
] as const;

export type FilterOp = (typeof FILTER_OPS)[number];

export type ColumnFilter = {
  id: string;
  column: string;
  op: FilterOp;
  value: string;
};

export type SortState = { column: string; dir: "asc" | "desc" } | null;

export const FILTER_OP_LABELS: Record<FilterOp, string> = {
  contains: "contains",
  equals: "equals",
  not: "does not equal",
  starts: "starts with",
  empty: "is empty",
  notEmpty: "is not empty",
  gt: "greater than",
  lt: "less than",
};

export function cellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function decodeEntities(text: string) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function padRows(columns: string[], rows: string[][]): string[][] {
  const width = Math.min(columns.length, MAX_COLS);
  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
}

function flattenRecord(
  item: Record<string, unknown>,
  prefix = "",
  depth = 0,
  into: Record<string, unknown> = {},
): Record<string, unknown> {
  for (const [key, value] of Object.entries(item)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      depth < 2 &&
      Object.keys(value as object).length > 0
    ) {
      flattenRecord(value as Record<string, unknown>, path, depth + 1, into);
    } else {
      into[path] = value;
    }
  }
  return into;
}

function gridFromObjectArray(items: Record<string, unknown>[], title?: string): ResponseGrid {
  const flat = items.map((item) => flattenRecord(item));
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of flat) {
    for (const key of Object.keys(item)) {
      if (seen.has(key) || keys.length >= MAX_COLS) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return {
    columns: keys,
    rows: padRows(
      keys,
      flat.map((item) => keys.map((key) => cellValue(item[key]))),
    ),
    source: "json-table",
    title,
  };
}

function collectObjectTables(
  value: unknown,
  path: string,
  into: Array<{ path: string; rows: Record<string, unknown>[] }>,
  depth = 0,
) {
  if (depth > 8) return;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item && typeof item === "object" && !Array.isArray(item))
  ) {
    into.push({ path: path || "rows", rows: value as Record<string, unknown>[] });
    return;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      collectObjectTables(nested, path ? `${path}.${key}` : key, into, depth + 1);
    }
  }
}

function gridFromJson(data: unknown, title?: string): ResponseGrid {
  if (Array.isArray(data)) {
    if (data.length === 0) return { columns: [], rows: [], source: "json-table", title };
    if (data.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
      return gridFromObjectArray(data as Record<string, unknown>[], title);
    }
    if (data.every((item) => Array.isArray(item))) {
      const width = Math.min(Math.max(0, ...data.map((row) => (row as unknown[]).length)), MAX_COLS);
      const columns = Array.from({ length: width }, (_, index) => `col ${index + 1}`);
      return {
        columns,
        rows: padRows(
          columns,
          data.map((row) => (row as unknown[]).map(cellValue)),
        ),
        source: "json-table",
        title,
      };
    }
    return {
      columns: ["value"],
      rows: padRows(["value"], data.map((item) => [cellValue(item)])),
      source: "json-table",
      title,
    };
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const tables: Array<{ path: string; rows: Record<string, unknown>[] }> = [];
    collectObjectTables(record, "", tables);
    tables.sort((left, right) => right.rows.length - left.rows.length);
    if (tables[0]) {
      return gridFromObjectArray(tables[0].rows, tables[0].path);
    }
    return {
      columns: ["field", "value"],
      rows: padRows(
        ["field", "value"],
        Object.entries(record).map(([key, value]) => [key, cellValue(value)]),
      ),
      source: "json-pairs",
      title,
    };
  }

  return { columns: ["value"], rows: [[cellValue(data)]], source: "json-pairs", title };
}

function gridFromHtml(html: string): ResponseGrid | null {
  const table = /<table\b[\s\S]*?<\/table>/i.exec(html);
  if (!table) return null;
  const rows: string[][] = [];
  const rowRe = /<tr\b[\s\S]*?<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(table[0]))) {
    const cells: string[] = [];
    const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[0]))) {
      cells.push(decodeEntities(cellMatch[1] ?? ""));
    }
    if (cells.length) rows.push(cells);
  }
  if (rows.length === 0) return null;
  const hasHeader = /<th\b/i.test(table[0]);
  const columns = hasHeader ? rows[0]! : rows[0]!.map((_, index) => `col ${index + 1}`);
  const dataRows = hasHeader ? rows.slice(1) : rows;
  return {
    columns: columns.slice(0, MAX_COLS),
    rows: padRows(columns, dataRows),
    source: "html",
  };
}

function splitDelimited(line: string, delimiter: string) {
  if (delimiter !== ",") return line.split(delimiter).map((part) => part.trim());
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function gridFromDelimited(raw: string): ResponseGrid | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return null;
  const candidates: Array<{ delimiter: string; source: ResponseGrid["source"] }> = [
    { delimiter: "\t", source: "csv" },
    { delimiter: ";", source: "csv" },
    { delimiter: ",", source: "csv" },
  ];
  for (const candidate of candidates) {
    const parsed = lines.map((line) => splitDelimited(line, candidate.delimiter));
    const width = parsed[0]?.length ?? 0;
    if (width < 2) continue;
    const similar = parsed.filter((row) => Math.abs(row.length - width) <= 1).length;
    if (similar < lines.length * 0.8) continue;
    const columns = parsed[0]!.slice(0, MAX_COLS);
    return {
      columns,
      rows: padRows(columns, parsed.slice(1)),
      source: candidate.source,
    };
  }
  return null;
}

export function parseResponseGrid(raw: string | null | undefined): ResponseGrid {
  const text = String(raw ?? "").trim();
  if (!text) return { columns: ["body"], rows: [[""]], source: "text" };

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return gridFromJson(JSON.parse(text));
    } catch {
      /* fall through */
    }
  }

  if (/<table\b/i.test(text)) {
    const html = gridFromHtml(text);
    if (html) return html;
  }

  const delimited = gridFromDelimited(text);
  if (delimited) return delimited;

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      return gridFromJson(JSON.parse(text));
    } catch {
      /* ignore */
    }
  }

  return { columns: ["body"], rows: [[text]], source: "text" };
}

export type ResponseDataset = { id: string; name: string; grid: ResponseGrid };

export function parseResponseDatasets(raw: string | null | undefined): ResponseDataset[] {
  const text = String(raw ?? "").trim();
  const fallback = parseResponseGrid(text);
  if (!text) return [{ id: "body", name: "Body", grid: fallback }];

  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const data = JSON.parse(text) as unknown;
      if (Array.isArray(data)) {
        return [
          {
            id: "rows",
            name: `Rows (${data.length})`,
            grid: gridFromJson(data),
          },
        ];
      }
      if (data && typeof data === "object") {
        const record = data as Record<string, unknown>;
        const tables: Array<{ path: string; rows: Record<string, unknown>[] }> = [];
        collectObjectTables(record, "", tables);
        tables.sort((left, right) => right.rows.length - left.rows.length);
        const datasets: ResponseDataset[] = tables.map((table) => ({
          id: table.path,
          name: `${table.path} (${table.rows.length})`,
          grid: gridFromObjectArray(table.rows, table.path),
        }));
        const tableRoots = new Set(tables.map((table) => table.path.split(".")[0] ?? table.path));
        const scalarRows = Object.entries(record)
          .filter(([key]) => !tableRoots.has(key))
          .map(([key, value]) => [key, cellValue(value)]);
        if (scalarRows.length) {
          datasets.push({
            id: "_fields",
            name: `Fields (${scalarRows.length})`,
            grid: {
              columns: ["field", "value"],
              rows: scalarRows,
              source: "json-pairs",
            },
          });
        }
        if (datasets.length) return datasets;
      }
    } catch {
      /* fall through */
    }
  }

  return [{ id: fallback.title || fallback.source, name: fallback.title || "Body", grid: fallback }];
}

export function previewGrid(grid: ResponseGrid, limit = 4) {
  return {
    columns: grid.columns.slice(0, 6),
    rows: grid.rows.slice(0, limit),
    totalRows: grid.rows.length,
    source: grid.source,
    title: grid.title,
  };
}

export function filterGrid(grid: ResponseGrid, query: string): ResponseGrid {
  return applyGridQuery(grid, { query });
}

export function columnIndex(columns: string[], name: string) {
  return columns.indexOf(name);
}

export function parseCellNumber(value: string) {
  const text = value.trim().replace(/,/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function compareCells(a: string, b: string) {
  const left = parseCellNumber(a);
  const right = parseCellNumber(b);
  if (left != null && right != null && left !== right) return left - right;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function matchFilter(cell: string, op: FilterOp, value: string) {
  const hay = cell.toLowerCase();
  const needle = value.trim().toLowerCase();
  switch (op) {
    case "contains":
      return !needle || hay.includes(needle);
    case "equals":
      return hay === needle;
    case "not":
      return hay !== needle;
    case "starts":
      return !needle || hay.startsWith(needle);
    case "empty":
      return cell.trim() === "";
    case "notEmpty":
      return cell.trim() !== "";
    case "gt":
    case "lt": {
      const left = parseCellNumber(cell);
      const right = parseCellNumber(value);
      if (left == null || right == null) {
        const cmp = compareCells(cell, value);
        return op === "gt" ? cmp > 0 : cmp < 0;
      }
      return op === "gt" ? left > right : left < right;
    }
    default:
      return true;
  }
}

export function applyGridQuery(
  grid: ResponseGrid,
  options: {
    query?: string;
    filters?: ColumnFilter[];
    sort?: SortState;
    visible?: string[] | null;
  } = {},
): ResponseGrid {
  const needle = options.query?.trim().toLowerCase() ?? "";
  const filters = options.filters ?? [];
  let rows = grid.rows;

  if (needle) {
    rows = rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(needle)));
  }

  for (const filter of filters) {
    const index = columnIndex(grid.columns, filter.column);
    if (index < 0) continue;
    rows = rows.filter((row) => matchFilter(row[index] ?? "", filter.op, filter.value));
  }

  if (options.sort && columnIndex(grid.columns, options.sort.column) >= 0) {
    const index = columnIndex(grid.columns, options.sort.column);
    const dir = options.sort.dir === "desc" ? -1 : 1;
    rows = [...rows].sort((left, right) => dir * compareCells(left[index] ?? "", right[index] ?? ""));
  }

  const visible = (options.visible ?? grid.columns).filter((column) => grid.columns.includes(column));
  const columns = visible.length > 0 ? visible : grid.columns;
  const indexes = columns.map((column) => columnIndex(grid.columns, column));

  return {
    ...grid,
    columns,
    rows: rows.map((row) => indexes.map((index) => row[index] ?? "")),
  };
}

export function reconcileVisible(saved: string[] | undefined, columns: string[]) {
  if (!columns.length) return [];
  if (!saved?.length) return columns;
  const known = new Set(columns);
  const kept = saved.filter((column) => known.has(column));
  const extra = columns.filter((column) => !saved.includes(column));
  const next = [...kept, ...extra];
  return next.length ? next : columns;
}

export function moveColumn(columns: string[], name: string, delta: number) {
  const index = columns.indexOf(name);
  if (index < 0) return columns;
  const next = index + delta;
  if (next < 0 || next >= columns.length) return columns;
  const copy = [...columns];
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item!);
  return copy;
}

export function distinctValues(grid: ResponseGrid, column: string, limit = 24) {
  const index = columnIndex(grid.columns, column);
  if (index < 0) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const row of grid.rows) {
    const value = row[index] ?? "";
    if (seen.has(value)) continue;
    seen.add(value);
    values.push(value);
    if (values.length > limit) return values;
  }
  return values;
}

export function gridToCsv(grid: ResponseGrid) {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  return [grid.columns.map(escape).join(","), ...grid.rows.map((row) => row.map(escape).join(","))].join("\n");
}

export function gridToTsv(grid: ResponseGrid) {
  return [grid.columns.join("\t"), ...grid.rows.map((row) => row.join("\t"))].join("\n");
}

export function rowsAsObjects(grid: ResponseGrid) {
  return grid.rows.map((row) => {
    const item: Record<string, string> = {};
    grid.columns.forEach((column, index) => {
      item[column] = row[index] ?? "";
    });
    return item;
  });
}
