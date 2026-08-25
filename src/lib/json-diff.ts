export function prettyJsonText(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export type JsonLineKind = "same" | "chg" | "add" | "del";

export type JsonLineDiff = {
  left: string;
  right: string;
  kind: JsonLineKind;
};

export function jsonLineDiff(current: string, previous: string): JsonLineDiff[] {
  const left = prettyJsonText(previous).split("\n");
  const right = prettyJsonText(current).split("\n");
  const n = Math.max(left.length, right.length);
  const rows: JsonLineDiff[] = [];
  for (let i = 0; i < n; i += 1) {
    const older = left[i];
    const newer = right[i];
    if (older === newer) rows.push({ left: older ?? "", right: newer ?? "", kind: "same" });
    else if (older == null) rows.push({ left: "", right: newer ?? "", kind: "add" });
    else if (newer == null) rows.push({ left: older, right: "", kind: "del" });
    else rows.push({ left: older, right: newer, kind: "chg" });
  }
  return rows;
}
