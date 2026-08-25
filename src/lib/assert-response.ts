export function readJsonPath(data: unknown, path: string): unknown {
  const raw = path.trim();
  if (!raw) return data;
  const parts = raw
    .replace(/^\$/, "")
    .split(/\.|\[|\]/)
    .map((part) => part.trim())
    .filter(Boolean);
  let current: unknown = data;
  for (const part of parts) {
    if (current == null) return undefined;
    if (/^\d+$/.test(part)) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(part)];
      continue;
    }
    if (typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function scalarText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function checkAssertions(
  body: string | null,
  httpStatus: number | null,
  rules: {
    assertStatus?: number | null;
    assertJsonPath?: string | null;
    assertEquals?: string | null;
    assertContains?: string | null;
  },
): string | null {
  const expectStatus = rules.assertStatus ?? 0;
  if (expectStatus > 0 && httpStatus !== expectStatus) {
    return `Expected HTTP ${expectStatus}, got ${httpStatus ?? "none"}`;
  }
  const needle = rules.assertContains?.trim() ?? "";
  if (needle && !(body ?? "").includes(needle)) {
    return `Response does not contain “${needle}”`;
  }
  const path = rules.assertJsonPath?.trim() ?? "";
  const equals = rules.assertEquals ?? "";
  if (!path) return null;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body ?? "");
  } catch {
    return "Response is not JSON";
  }
  const value = readJsonPath(parsed, path);
  if (value === undefined) return `JSON path ${path} is missing`;
  if (equals !== "" && scalarText(value) !== equals) {
    return `JSON path ${path} is “${scalarText(value)}”, expected “${equals}”`;
  }
  return null;
}
