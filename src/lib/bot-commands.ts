export type BotCommand =
  | { kind: "ack"; query: string; note?: string }
  | { kind: "run"; query: string }
  | { kind: "snooze"; query: string; hours: number };

export function parseBotCommand(raw: string): BotCommand | null {
  const text = raw.trim().replace(/^\/+/, "");
  const [head, ...rest] = text.split(/\s+/);
  const cmd = (head ?? "").toLowerCase();
  if (cmd !== "ack" && cmd !== "run" && cmd !== "snooze") return null;
  if (cmd === "snooze") {
    const hoursRaw = rest[rest.length - 1];
    const hours = Number(hoursRaw);
    const query = Number.isFinite(hours) ? rest.slice(0, -1).join(" ") : rest.join(" ");
    return { kind: "snooze", query: query.trim(), hours: Number.isFinite(hours) && hours > 0 ? hours : 1 };
  }
  if (cmd === "ack") {
    const [query, ...note] = rest;
    return { kind: "ack", query: query ?? "", note: note.join(" ") };
  }
  return { kind: "run", query: rest.join(" ") };
}

export function matchJobName<T extends { id: string; name: string }>(jobs: T[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = jobs.find((job) => job.name.toLowerCase() === q || job.id === query.trim());
  if (exact) return exact;
  const partial = jobs.filter((job) => job.name.toLowerCase().includes(q));
  return partial.length === 1 ? partial[0]! : null;
}
