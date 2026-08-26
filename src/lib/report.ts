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
