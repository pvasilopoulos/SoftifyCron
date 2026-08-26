export function parseHostList(raw: string | null | undefined) {
  return String(raw ?? "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
