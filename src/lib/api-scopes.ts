export const API_SCOPES = [
  "jobs.read",
  "jobs.write",
  "jobs.run",
  "jobs.delete",
  "runs.read",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABELS: Record<ApiScope, { title: string; hint: string }> = {
  "jobs.read": { title: "Read jobs", hint: "List jobs, groups, incidents, and the calendar" },
  "jobs.write": { title: "Write jobs", hint: "Create, edit, pause, skip, snooze, mute, and duplicate" },
  "jobs.run": { title: "Run jobs", hint: "Run now, heartbeat pings, and acknowledge failures" },
  "jobs.delete": { title: "Delete jobs", hint: "Permanently delete jobs" },
  "runs.read": { title: "Read runs", hint: "List run history and fetch a single run" },
};

export const DEFAULT_API_SCOPES: ApiScope[] = ["jobs.read", "jobs.write", "jobs.run", "runs.read"];
export const LEGACY_API_SCOPES: ApiScope[] = [...API_SCOPES];

const ALLOWED = new Set<string>(API_SCOPES);

const IMPLIES: Partial<Record<ApiScope, ApiScope[]>> = {
  "jobs.write": ["jobs.read"],
  "jobs.run": ["jobs.read"],
  "jobs.delete": ["jobs.read"],
};

export function parseApiScopes(raw: string | string[] | null | undefined): ApiScope[] {
  const parts = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .split(",")
        .map((item) => item.trim());
  const seen = new Set<ApiScope>();
  for (const part of parts) {
    if (ALLOWED.has(part)) seen.add(part as ApiScope);
  }
  return API_SCOPES.filter((scope) => seen.has(scope));
}

export function expandApiScopes(scopes: readonly ApiScope[]): ApiScope[] {
  const next = new Set<ApiScope>(scopes);
  for (const scope of scopes) {
    for (const extra of IMPLIES[scope] ?? []) next.add(extra);
  }
  return API_SCOPES.filter((scope) => next.has(scope));
}

export function serializeApiScopes(scopes: readonly ApiScope[]) {
  return expandApiScopes(scopes).join(",");
}

export function resolveStoredScopes(raw: string | null | undefined): ApiScope[] {
  const parsed = parseApiScopes(raw);
  if (parsed.length === 0) return [...LEGACY_API_SCOPES];
  return expandApiScopes(parsed);
}

export function hasApiScope(granted: readonly ApiScope[], needed: ApiScope) {
  return granted.includes(needed);
}
