export type ReportRow = {
  job: string;
  type: string;
  runs: number;
  failed: number;
  incidents: number;
  openMinutes: number;
};

export function csvEscape(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function monthlyOpsCsv(rows: ReportRow[]) {
  const header = ["Job", "Type", "Runs", "Failed", "Incidents", "Open minutes"];
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(
      [row.job, row.type, row.runs, row.failed, row.incidents, Math.round(row.openMinutes)].map(csvEscape).join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function reportMonthRange(month?: string | null, now = new Date()) {
  const start =
    month && /^\d{4}-\d{2}$/.test(month)
      ? new Date(`${month}-01T00:00:00`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  return { start, end, key };
}

export function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function pdfSafe(value: string) {
  return [...value].map((ch) => (ch.charCodeAt(0) <= 255 ? ch : "?")).join("");
}

export function monthlyOpsPdf(title: string, month: string, rows: ReportRow[]) {
  const lines = [
    pdfSafe(`${title} · ${month}`),
    "Job / Type / Runs / Failed / Incidents / Open minutes",
    ...rows.map(
      (row) =>
        `${pdfSafe(row.job)}  ${row.type}  ${row.runs}  ${row.failed}  ${row.incidents}  ${Math.round(row.openMinutes)}`,
    ),
  ];
  const contentLines = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];
  for (const line of lines) {
    contentLines.push(`(${pdfEscape(line)}) Tj`, "T*");
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let offset = 0;
  const chunks: string[] = ["%PDF-1.4\n"];
  const xref = [0];
  offset = Buffer.byteLength(chunks[0]!, "utf8");
  objects.forEach((body, index) => {
    xref.push(offset);
    const obj = `${index + 1} 0 obj\n${body}\nendobj\n`;
    chunks.push(obj);
    offset += Buffer.byteLength(obj, "utf8");
  });
  const xrefStart = offset;
  const xrefTable = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...xref.slice(1).map((pos) => `${String(pos).padStart(10, "0")} 00000 n `),
  ].join("\n");
  chunks.push(
    `${xrefTable}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );
  return Buffer.concat(chunks.map((part) => Buffer.from(part, "utf8")));
}

