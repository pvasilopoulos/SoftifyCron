"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  deletePlatformUserAction,
  updatePlatformUserAction,
  updatePlatformUserRoleAction,
} from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDateTime } from "@/lib/format";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  memberships: {
    id: string;
    role: string;
    tenantId: string;
    tenant: { id: string; name: string };
    roleRef: { key: string; name: string } | null;
  }[];
};

export type RoleOption = { tenantId: string; key: string; name: string };
export type TenantOption = { id: string; name: string; slug: string };

const FALLBACK_ROLES = [
  { key: "OWNER", name: "Owner" },
  { key: "ADMIN", name: "Admin" },
  { key: "MEMBER", name: "Member" },
];

function rolesForTenant(roles: RoleOption[], tenantId: string) {
  const found = roles.filter((role) => role.tenantId === tenantId);
  return found.length ? found : FALLBACK_ROLES;
}

export function UserDirectory({
  users,
  tenants,
  roles,
}: {
  users: DirectoryUser[];
  tenants: TenantOption[];
  roles: RoleOption[];
}) {
  return (
    <section className="space-y-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} tenants={tenants} roles={roles} />
      ))}
    </section>
  );
}

function UserCard({
  user,
  tenants,
  roles,
}: {
  user: DirectoryUser;
  tenants: TenantOption[];
  roles: RoleOption[];
}) {
  const [panel, setPanel] = useState<"user" | "role" | "delete" | null>(null);

  return (
    <article className="card card-hover p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/admin/users/${user.id}`} className="font-medium hover:text-gold">
            {user.name}
          </Link>
          <p className="text-sm text-ink-dim">{user.email}</p>
          <p className="mt-2 text-xs text-ink-dim">
            Joined {formatDateTime(user.createdAt, "UTC")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.memberships.length === 0 ? (
              <span className="text-xs text-ink-dim">No tenant</span>
            ) : (
              user.memberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={`/admin/tenants/${membership.tenant.id}`}
                  className="rounded-full bg-bg-mute px-2.5 py-1 text-xs"
                >
                  {membership.tenant.name} ·{" "}
                  {(membership.roleRef?.name ?? membership.role).toLowerCase()}
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn ${panel === "role" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setPanel(panel === "role" ? null : "role")}
          >
            Edit role
          </button>
          <button
            className={`btn ${panel === "user" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setPanel(panel === "user" ? null : "user")}
          >
            Edit user
          </button>
          <button className="btn btn-danger" type="button" onClick={() => setPanel("delete")}>
            Delete
          </button>
        </div>
      </div>

      {panel === "user" ? (
        <div className="mt-5 border-t border-line pt-5">
          <EditUserForm user={user} next="/admin/users" />
        </div>
      ) : null}

      {panel === "role" ? (
        <div className="mt-5 space-y-4 border-t border-line pt-5">
          {user.memberships.length === 0 ? (
            <AssignRoleForm userId={user.id} tenants={tenants} roles={roles} next="/admin/users" />
          ) : (
            user.memberships.map((membership) => (
              <EditRoleForm
                key={membership.id}
                userId={user.id}
                membership={membership}
                roles={rolesForTenant(roles, membership.tenantId)}
                next="/admin/users"
              />
            ))
          )}
        </div>
      ) : null}

      {panel === "delete" ? (
        <ConfirmDialog
          title={`Delete ${user.name}?`}
          body="This removes the login and every tenant membership. Jobs stay in their workspaces."
          onCancel={() => setPanel(null)}
        >
          <form action={deletePlatformUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="next" value="/admin/users" />
            <button className="btn btn-danger" type="submit">
              Delete user
            </button>
          </form>
        </ConfirmDialog>
      ) : null}
    </article>
  );
}

function EditUserForm({ user, next }: { user: DirectoryUser; next: string }) {
  const [state, formAction, pending] = useActionState(updatePlatformUserAction, null);
  return (
    <form action={formAction} className="grid max-w-lg gap-4">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="field-label">Full name</span>
        <input className="field" name="name" defaultValue={user.name} required minLength={2} />
      </label>
      <label className="block">
        <span className="field-label">Email</span>
        <input
          className="field"
          type="email"
          name="email"
          defaultValue={user.email}
          required
        />
      </label>
      <label className="block">
        <span className="field-label">New password</span>
        <input className="field" type="password" name="password" minLength={8} placeholder="Leave blank to keep" />
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save user"}
      </button>
    </form>
  );
}

function EditRoleForm({
  userId,
  membership,
  roles,
  next,
}: {
  userId: string;
  membership: DirectoryUser["memberships"][number];
  roles: { key: string; name: string }[];
  next: string;
}) {
  const [state, formAction, pending] = useActionState(updatePlatformUserRoleAction, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="membershipId" value={membership.id} />
      <input type="hidden" name="next" value={next} />
      <label className="min-w-48 flex-1">
        <span className="field-label">{membership.tenant.name}</span>
        <select
          className="field"
          name="role"
          defaultValue={membership.roleRef?.key ?? membership.role}
        >
          {roles.map((role) => (
            <option key={role.key} value={role.key}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save role"}
      </button>
      {state?.error ? <p className="w-full text-sm text-rose">{state.error}</p> : null}
    </form>
  );
}

function AssignRoleForm({
  userId,
  tenants,
  roles,
  next,
}: {
  userId: string;
  tenants: TenantOption[];
  roles: RoleOption[];
  next: string;
}) {
  const [state, formAction, pending] = useActionState(updatePlatformUserRoleAction, null);
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const choices = useMemo(() => rolesForTenant(roles, tenantId), [roles, tenantId]);

  if (tenants.length === 0) {
    return <p className="text-sm text-ink-dim">Create a tenant first, then assign a role.</p>;
  }

  return (
    <form action={formAction} className="grid max-w-lg gap-4">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="field-label">Tenant</span>
        <select
          className="field"
          name="tenantId"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        >
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name} ({tenant.slug})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Role</span>
        <select className="field" name="role" key={tenantId} defaultValue="MEMBER">
          {choices.map((role) => (
            <option key={role.key} value={role.key}>
              {role.name}
            </option>
          ))}
        </select>
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Assign role"}
      </button>
    </form>
  );
}

export function PlatformUserActions({
  user,
  tenants,
  roles,
  error,
}: {
  user: DirectoryUser;
  tenants: TenantOption[];
  roles: RoleOption[];
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const next = `/admin/users/${user.id}`;
  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-rose">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-danger" type="button" onClick={() => setOpen(true)}>
          Delete
        </button>
      </div>
      <section className="card p-6 max-w-lg">
        <h2 className="font-display text-2xl">Edit user</h2>
        <div className="mt-6">
          <EditUserForm user={user} next={next} />
        </div>
      </section>
      <section className="card p-6">
        <h2 className="font-display text-2xl">Edit role</h2>
        <div className="mt-6 space-y-4">
          {user.memberships.length === 0 ? (
            <AssignRoleForm userId={user.id} tenants={tenants} roles={roles} next={next} />
          ) : (
            user.memberships.map((membership) => (
              <EditRoleForm
                key={membership.id}
                userId={user.id}
                membership={membership}
                roles={rolesForTenant(roles, membership.tenantId)}
                next={next}
              />
            ))
          )}
        </div>
      </section>
      {open ? (
        <ConfirmDialog
          title={`Delete ${user.name}?`}
          body="This removes the login and every tenant membership. Jobs stay in their workspaces."
          onCancel={() => setOpen(false)}
        >
          <form action={deletePlatformUserAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="next" value="/admin/users" />
            <button className="btn btn-danger" type="submit">
              Delete user
            </button>
          </form>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
