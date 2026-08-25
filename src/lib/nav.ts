export type NavId =
  | "tenants"
  | "monitor"
  | "home"
  | "jobs"
  | "runs"
  | "responses"
  | "audit"
  | "people"
  | "roles"
  | "settings";

export type NavGroupId = "platform" | "workspace" | "team" | "account";

export type NavItem = {
  id: NavId;
  href: string;
  label: string;
  group: NavGroupId;
};

export const NAV_ITEMS: NavItem[] = [
  { id: "tenants", href: "/admin", label: "Tenants", group: "platform" },
  { id: "monitor", href: "/admin/monitor", label: "Monitor", group: "platform" },
  { id: "home", href: "/dashboard", label: "Home", group: "workspace" },
  { id: "jobs", href: "/jobs", label: "Jobs", group: "workspace" },
  { id: "runs", href: "/runs", label: "Runs", group: "workspace" },
  { id: "responses", href: "/responses", label: "Responses", group: "workspace" },
  { id: "audit", href: "/audit", label: "Audit", group: "workspace" },
  { id: "people", href: "/settings#people", label: "People", group: "team" },
  { id: "roles", href: "/settings#roles", label: "Roles", group: "team" },
  { id: "settings", href: "/settings#workspace", label: "Settings", group: "account" },
];

export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: "platform", label: "Platform" },
  { id: "workspace", label: "Workspace" },
  { id: "team", label: "Team" },
  { id: "account", label: "Account" },
];

export const FOOTER_NAV_KEY = "sc-footer-nav";
export const FOOTER_PIN_COUNT = 3;
export const DEFAULT_FOOTER_NAV: NavId[] = ["home", "jobs", "runs"];
export const RAIL_GROUPS_KEY = "sc-rail-groups";

export function navForSession(platform: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => item.group !== "platform" || platform);
}

export function groupedNav(items: NavItem[]) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}

export function fillFooterNav(ids: NavId[], allowed: NavId[]): NavId[] {
  const allowedSet = new Set(allowed);
  const next: NavId[] = [];
  for (const id of ids) {
    if (allowedSet.has(id) && !next.includes(id)) next.push(id);
    if (next.length === FOOTER_PIN_COUNT) return next;
  }
  for (const id of DEFAULT_FOOTER_NAV) {
    if (allowedSet.has(id) && !next.includes(id)) next.push(id);
    if (next.length === FOOTER_PIN_COUNT) return next;
  }
  for (const id of allowed) {
    if (!next.includes(id)) next.push(id);
    if (next.length === FOOTER_PIN_COUNT) return next;
  }
  return next;
}

export function parseFooterNav(raw: string | null, allowed: NavId[]): NavId[] {
  if (!raw) return fillFooterNav(DEFAULT_FOOTER_NAV, allowed);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fillFooterNav(DEFAULT_FOOTER_NAV, allowed);
    const ids = parsed.filter((id): id is NavId =>
      typeof id === "string" && allowed.includes(id as NavId),
    );
    return fillFooterNav(ids, allowed);
  } catch {
    return fillFooterNav(DEFAULT_FOOTER_NAV, allowed);
  }
}

export function readFooterNav(allowed: NavId[]): NavId[] {
  try {
    return parseFooterNav(localStorage.getItem(FOOTER_NAV_KEY), allowed);
  } catch {
    return fillFooterNav(DEFAULT_FOOTER_NAV, allowed);
  }
}

export function persistFooterNav(ids: NavId[]) {
  localStorage.setItem(FOOTER_NAV_KEY, JSON.stringify(ids.slice(0, FOOTER_PIN_COUNT)));
  window.dispatchEvent(new Event("sc-appearance"));
}

export function parseRailGroups(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Groups start expanded unless the stored value is explicitly false. */
export function isRailGroupExpanded(id: string, stored: Record<string, boolean>) {
  return stored[id] !== false;
}

export function readRailGroups(): Record<string, boolean> {
  try {
    return parseRailGroups(localStorage.getItem(RAIL_GROUPS_KEY));
  } catch {
    return {};
  }
}

export function persistRailGroupExpanded(id: string, expanded: boolean) {
  const next = { ...readRailGroups(), [id]: expanded };
  localStorage.setItem(RAIL_GROUPS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("sc-appearance"));
}

export function isNavActive(pathname: string, hash: string, item: NavItem) {
  const [path, itemHash] = item.href.split("#");
  if (itemHash) {
    const current = hash.replace("#", "") || "people";
    if (item.id === "settings") {
      return pathname === "/settings" && current !== "people" && current !== "roles";
    }
    return pathname === "/settings" && current === itemHash;
  }
  if (path === "/dashboard") return pathname === "/dashboard";
  if (path === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/tenants");
  if (path === "/admin/monitor") {
    return pathname === "/admin/monitor" || pathname.startsWith("/admin/runs");
  }
  if (path === "/responses") {
    return pathname === "/responses" || pathname.startsWith("/responses/");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
