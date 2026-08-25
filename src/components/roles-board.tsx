"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "@/components/toaster";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  parseGrants,
  type Permission,
} from "@/lib/acl";

export type TenantRoleView = {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: string;
  system: boolean;
  locked: boolean;
  sortOrder: number;
  _count: { memberships: number; invites: number };
};

type RoleEndpoints = {
  list: string;
  item: (id: string) => string;
};

const DEFAULT_ENDPOINTS: RoleEndpoints = {
  list: "/api/roles",
  item: (id) => `/api/roles/${id}`,
};

function emptyDraft(): { name: string; description: string; permissions: Permission[] } {
  return {
    name: "",
    description: "",
    permissions: ["jobs.view", "runs.view", "people.view"],
  };
}

function draftFrom(role: TenantRoleView) {
  return {
    name: role.name,
    description: role.description,
    permissions: parseGrants(role.permissions),
  };
}

export function RolesBoard({
  roles,
  canManage,
  endpoints = DEFAULT_ENDPOINTS,
}: {
  roles: TenantRoleView[];
  canManage: boolean;
  endpoints?: RoleEndpoints;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [reassignTo, setReassignTo] = useState("MEMBER");
  const [busy, setBusy] = useState(false);

  const otherRoles = useMemo(
    () => roles.filter((role) => role.key !== (typeof editing === "string" ? roles.find((item) => item.id === editing)?.key : "")),
    [editing, roles],
  );

  function refresh() {
    router.refresh();
  }

  function startCreate() {
    setDraft(emptyDraft());
    setEditing("new");
  }

  function startEdit(role: TenantRoleView) {
    setDraft(draftFrom(role));
    setEditing(role.id);
    setReassignTo("MEMBER");
  }

  function toggle(permission: Permission, enabled: boolean) {
    setDraft((current) => ({
      ...current,
      permissions: enabled
        ? [...new Set([...current.permissions, permission])]
        : current.permissions.filter((item) => item !== permission),
    }));
  }

  async function save() {
    setBusy(true);
    try {
      const isNew = editing === "new";
      const response = await fetch(isNew ? endpoints.list : endpoints.item(String(editing)), {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not save role");
      toast(isNew ? "Role created" : "Role updated");
      setEditing(null);
      refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save role", "err");
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: TenantRoleView) {
    const inUse = role._count.memberships + role._count.invites;
    const label = inUse
      ? `Delete ${role.name} and move ${inUse} ${inUse === 1 ? "person" : "people"} to another role?`
      : `Delete ${role.name}?`;
    if (!confirm(label)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoints.item(role.id), {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(inUse ? { reassignTo } : {}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not delete role");
      toast("Role deleted");
      setEditing(null);
      refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete role", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Roles</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-dim">
            Built-in roles can be edited. Create custom roles for operators, billing, or read-only
            access.
          </p>
        </div>
        {canManage ? (
          <button className="btn btn-gold" type="button" onClick={startCreate}>
            New role
          </button>
        ) : null}
      </div>

      {editing === "new" ? (
        <RoleEditor
          draft={draft}
          busy={busy}
          title="New role"
          onChange={setDraft}
          onToggle={toggle}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {roles.map((role) => {
          const perms = parseGrants(role.permissions);
          const used = role._count.memberships;
          const open = editing === role.id;
          return (
            <article key={role.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{role.name}</h3>
                    <span className="badge-quiet">
                      {role.locked ? "locked" : role.system ? "built-in" : "custom"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-dim">
                    {role.description || "No description"}
                  </p>
                  <p className="mt-2 text-xs text-ink-dim">
                    {used} {used === 1 ? "person" : "people"}
                    {role._count.invites ? ` · ${role._count.invites} invites` : ""}
                  </p>
                </div>
                {canManage && !role.locked ? (
                  <div className="flex gap-2">
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(role)}>
                      Edit
                    </button>
                    {role.system ? null : (
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={busy}
                        onClick={() => remove(role)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {perms.length === 0 ? (
                  <span className="text-xs text-ink-dim">No permissions</span>
                ) : (
                  perms.map((permission) => (
                    <span key={permission} className="perm-chip">
                      {PERMISSION_LABELS[permission]}
                    </span>
                  ))
                )}
              </div>
              {open ? (
                <div className="mt-5 border-t border-line pt-5">
                  <RoleEditor
                    draft={draft}
                    busy={busy}
                    title={`Edit ${role.name}`}
                    onChange={setDraft}
                    onToggle={toggle}
                    onSave={save}
                    onCancel={() => setEditing(null)}
                    footer={
                      role.system ? null : (
                        <label className="block sm:max-w-xs">
                          <span className="field-label">If deleted, move people to</span>
                          <select
                            className="field"
                            value={reassignTo}
                            onChange={(event) => setReassignTo(event.target.value)}
                          >
                            {otherRoles.map((item) => (
                              <option key={item.key} value={item.key}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    }
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RoleEditor({
  draft,
  busy,
  title,
  onChange,
  onToggle,
  onSave,
  onCancel,
  footer,
}: {
  draft: { name: string; description: string; permissions: Permission[] };
  busy: boolean;
  title: string;
  onChange: (draft: { name: string; description: string; permissions: Permission[] }) => void;
  onToggle: (permission: Permission, enabled: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg p-5">
      <h3 className="font-display text-xl">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Name</span>
          <input
            className="field"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            required
            minLength={2}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">Description</span>
          <input
            className="field"
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            maxLength={240}
            placeholder="What this role is for"
          />
        </label>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.id} className="rounded-2xl border border-line bg-bg p-4">
            <legend className="px-1 text-xs uppercase tracking-[0.14em] text-gold">
              {group.label}
            </legend>
            <div className="space-y-2">
              {group.permissions.map((permission) => (
                <label key={permission} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(permission)}
                    onChange={(event) => onToggle(permission, event.target.checked)}
                  />
                  {PERMISSION_LABELS[permission]}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="btn btn-gold" type="button" disabled={busy} onClick={onSave}>
          {busy ? "Saving…" : "Save role"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
