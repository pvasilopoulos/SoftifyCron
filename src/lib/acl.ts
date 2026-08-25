import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "jobs.view",
  "jobs.run",
  "jobs.edit",
  "jobs.delete",
  "runs.view",
  "secrets.manage",
  "people.view",
  "people.manage",
  "settings.edit",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "jobs.view": "View jobs",
  "jobs.run": "Run jobs now",
  "jobs.edit": "Create and edit jobs",
  "jobs.delete": "Delete jobs",
  "runs.view": "View run history",
  "secrets.manage": "Manage secrets",
  "people.view": "View teammates",
  "people.manage": "Manage roles and invites",
  "settings.edit": "Edit workspace settings",
};

export const EXTRA_GRANTS: Permission[] = [
  "jobs.run",
  "jobs.edit",
  "jobs.delete",
  "secrets.manage",
  "people.manage",
  "settings.edit",
];

export const PERMISSION_GROUPS: { id: string; label: string; permissions: Permission[] }[] = [
  {
    id: "jobs",
    label: "Jobs",
    permissions: ["jobs.view", "jobs.run", "jobs.edit", "jobs.delete", "runs.view"],
  },
  {
    id: "workspace",
    label: "Workspace",
    permissions: ["people.view", "people.manage", "secrets.manage", "settings.edit"],
  },
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  ADMIN: [
    "jobs.view",
    "jobs.run",
    "jobs.edit",
    "jobs.delete",
    "runs.view",
    "secrets.manage",
    "people.view",
    "people.manage",
    "settings.edit",
  ],
  MEMBER: ["jobs.view", "runs.view", "people.view"],
};

export function parseGrants(raw: string | null | undefined): Permission[] {
  if (!raw?.trim()) return [];
  const allowed = new Set<string>(PERMISSIONS);
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is Permission => allowed.has(item));
}

export function serializeGrants(grants: Permission[]) {
  return [...new Set(grants)].join(",");
}

export function rolePermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function effectivePermissions(
  role: Role,
  grants = "",
  platform = false,
  rolePerms?: string,
): Permission[] {
  if (platform || role === "OWNER") return [...PERMISSIONS];
  const base =
    rolePerms != null && rolePerms !== "" ? parseGrants(rolePerms) : [...ROLE_PERMISSIONS[role]];
  const extras = parseGrants(grants);
  return [...new Set([...base, ...extras])];
}

export type PermissionActor = {
  role: Role;
  platform?: boolean;
  grants?: string;
  rolePerms?: string;
};

export function hasPermission(actor: PermissionActor, permission: Permission) {
  return effectivePermissions(
    actor.role,
    actor.grants,
    actor.platform,
    actor.rolePerms,
  ).includes(permission);
}

export function canManage(role: Role) {
  return role === "OWNER" || role === "ADMIN";
}

export function canInviteRole(actor: Role, inviteRole: Role) {
  if (inviteRole === "OWNER") return false;
  if (actor === "OWNER") return inviteRole === "ADMIN" || inviteRole === "MEMBER";
  if (actor === "ADMIN" || actor === "MEMBER") return inviteRole === "MEMBER";
  return false;
}

export type JobAccess = {
  edit: boolean;
  run: boolean;
  delete: boolean;
};

export function jobAccess(actor: PermissionActor): JobAccess {
  return {
    edit: hasPermission(actor, "jobs.edit"),
    run: hasPermission(actor, "jobs.run"),
    delete: hasPermission(actor, "jobs.delete"),
  };
}

export const JOB_TYPES = ["HTTP", "HEARTBEAT", "WEBHOOK"] as const;

export const GROUP_COLORS = [
  "#7dffce",
  "#8b9cff",
  "#ffc46b",
  "#ff8fab",
  "#7ec8ff",
  "#c4b5fd",
];
