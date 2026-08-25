import {
  PERMISSIONS,
  parseGrants,
  serializeGrants,
  type Permission,
} from "./acl";

export const SYSTEM_ROLE_KEYS = ["OWNER", "ADMIN", "MEMBER"] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export const RESERVED_ROLE_SLUGS = new Set(
  SYSTEM_ROLE_KEYS.map((key) => key.toLowerCase()),
);

export function isSystemRoleKey(key: string): key is SystemRoleKey {
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(key);
}

export function rankFromRoleKey(key: string): SystemRoleKey {
  if (key === "OWNER" || key === "ADMIN") return key;
  return "MEMBER";
}

export function expandPermissions(input: string[] | Permission[]): Permission[] {
  const allowed = new Set<string>(PERMISSIONS);
  const next = new Set<Permission>();
  for (const item of input) {
    if (!allowed.has(item)) continue;
    next.add(item as Permission);
    if (item === "jobs.edit" || item === "jobs.delete" || item === "jobs.run") {
      next.add("jobs.view");
      next.add("runs.view");
    }
    if (item === "people.manage") next.add("people.view");
  }
  return PERMISSIONS.filter((permission) => next.has(permission));
}

export function permissionsFromStored(raw: string): Permission[] {
  return expandPermissions(parseGrants(raw));
}

export function storePermissions(input: string[] | Permission[]): string {
  return serializeGrants(expandPermissions(input));
}

export function assertRoleMutation(input: {
  action: "create" | "update" | "delete";
  system: boolean;
  locked: boolean;
  key?: string;
  memberCount?: number;
  inviteCount?: number;
  reassignKey?: string;
}) {
  if (input.action === "create" && input.key && isSystemRoleKey(input.key)) {
    throw new Error("That name is reserved for a built-in role");
  }
  if (input.action === "update" && input.locked) {
    throw new Error("The owner role cannot be edited");
  }
  if (input.action !== "delete") return;
  if (input.system) throw new Error("Built-in roles cannot be deleted");
  const inUse = (input.memberCount ?? 0) + (input.inviteCount ?? 0);
  if (inUse > 0 && !input.reassignKey) {
    throw new Error("Reassign people before deleting this role");
  }
  if (input.reassignKey && input.reassignKey === input.key) {
    throw new Error("Pick a different role to reassign");
  }
}
