export type ResponseGrid = {
  columns: string[];
  rows: string[][];
  source: "json-table" | "json-pairs" | "csv" | "html" | "text";
  title?: string;
};

const MAX_ROWS = 500;
const MAX_COLS = 40;

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
  return rows.slice(0, MAX_ROWS).map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  );
}

function gridFromObjectArray(items: Record<string, unknown>[], title?: string): ResponseGrid {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
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
      items.map((item) => keys.map((key) => cellValue(item[key]))),
    ),
    source: "json-table",
    title,
  };
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
    const nested = Object.entries(record).find(
      ([, value]) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => item && typeof item === "object" && !Array.isArray(item)),
    );
    if (nested) {
      return gridFromObjectArray(nested[1] as Record<string, unknown>[], nested[0]);
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
  const needle = query.trim().toLowerCase();
  if (!needle) return grid;
  return {
    ...grid,
    rows: grid.rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(needle))),
  };
}
