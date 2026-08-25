"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/toaster";
import { formatDateTime } from "@/lib/format";
import {
  EXTRA_GRANTS,
  PERMISSION_LABELS,
  parseGrants,
  type Permission,
} from "@/lib/acl";
import type { TenantRoleView } from "@/components/roles-board";

type Member = {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  roleKey?: string;
  roleName?: string;
  grants: string;
  createdAt: Date | string;
  name: string;
  email: string;
  permissions: Permission[];
  canChangeRole: boolean;
  canChangeGrants: boolean;
  canRemove: boolean;
  self: boolean;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  roleRef?: { name: string; key: string } | null;
  expiresAt: Date | string;
};

type PeopleEndpoints = {
  members: string;
  member: (id: string) => string;
  invites: string;
  invite: (id: string) => string;
};

const DEFAULT_ENDPOINTS: PeopleEndpoints = {
  members: "/api/members",
  member: (id) => `/api/members/${id}`,
  invites: "/api/invites",
  invite: (id) => `/api/invites?id=${id}`,
};

function assignableRoles(roles: TenantRoleView[], actorRole: string, allowOwnerRole: boolean) {
  return roles.filter((role) => {
    if (role.key === "OWNER") return allowOwnerRole;
    if (role.key === "ADMIN") return actorRole === "OWNER" || allowOwnerRole;
    return true;
  });
}

export function PeopleBoard({
  members,
  invites,
  roles,
  canManagePeople,
  actorRole,
  allowOwnerRole = false,
  endpoints = DEFAULT_ENDPOINTS,
}: {
  members: Member[];
  invites: Invite[];
  roles: TenantRoleView[];
  canManagePeople: boolean;
  actorRole: string;
  allowOwnerRole?: boolean;
  endpoints?: PeopleEndpoints;
}) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"invite" | "create" | "attach">("invite");
  const [busy, setBusy] = useState<string | null>(null);
  const choices = assignableRoles(roles, actorRole, allowOwnerRole);
  const defaultKey = choices.some((role) => role.key === "MEMBER") ? "MEMBER" : (choices[0]?.key ?? "MEMBER");

  function refresh() {
    router.refresh();
  }

  async function patchMember(id: string, body: object) {
    const response = await fetch(endpoints.member(id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Update failed");
    refresh();
  }

  async function onRole(id: string, roleKey: string) {
    setBusy(id);
    try {
      await patchMember(id, { role: roleKey, roleKey });
      toast("Role updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not change role", "err");
    } finally {
      setBusy(null);
    }
  }

  async function onGrant(member: Member, permission: Permission, enabled: boolean) {
    const current = parseGrants(member.grants);
    const next = enabled
      ? [...new Set([...current, permission])]
      : current.filter((item) => item !== permission);
    setBusy(member.id);
    try {
      await patchMember(member.id, { grants: next });
      toast("Permissions updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not change permissions", "err");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(member: Member) {
    const label = member.self ? "Leave this workspace?" : `Remove ${member.name} from this tenant?`;
    if (!confirm(label)) return;
    setBusy(member.id);
    try {
      const response = await fetch(endpoints.member(member.id), { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Remove failed");
      if (data.left) {
        router.push("/login");
        return;
      }
      toast("Teammate removed");
      refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not remove teammate", "err");
    } finally {
      setBusy(null);
    }
  }

  async function onInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy("add");
    try {
      if (mode === "invite") {
        const response = await fetch(endpoints.invites, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: data.email, role: data.role }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Could not invite");
        setInviteUrl(payload.url);
        form.reset();
        toast("Invite created — copy the link");
      } else {
        const response = await fetch(endpoints.members, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            name: data.name,
            password: data.password,
            role: data.role,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Could not add teammate");
        form.reset();
        toast(payload.createdUser ? "Login created" : "Existing account joined this tenant");
      }
      refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not add teammate", "err");
    } finally {
      setBusy(null);
    }
  }

  async function revoke(id: string) {
    await fetch(endpoints.invite(id), { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl italic">People</h2>
          <p className="mt-1 text-sm text-ink-dim">
            {members.length} {members.length === 1 ? "person" : "people"} in this workspace.
          </p>
        </div>
      </div>

      <section className="card overflow-hidden">
        <ul className="divide-y divide-line">
          {members.map((member) => {
            const roleKey = member.roleKey ?? member.role;
            return (
              <li key={member.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rail-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {member.name}
                        {member.self ? <span className="ml-2 text-xs text-gold">you</span> : null}
                      </p>
                      <p className="truncate text-sm text-ink-dim">{member.email}</p>
                      <p className="mt-1 text-xs text-ink-dim">
                        Joined {formatDateTime(member.createdAt, "UTC")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {member.canChangeRole ? (
                      <select
                        className="field max-w-44"
                        value={roleKey}
                        disabled={busy === member.id}
                        onChange={(event) => onRole(member.id, event.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-gold/12 px-3 py-1 text-xs uppercase tracking-[0.14em] text-gold">
                        {(member.roleName ?? member.role).toLowerCase()}
                      </span>
                    )}
                    {member.canRemove ? (
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={busy === member.id}
                        onClick={() => onRemove(member)}
                      >
                        {member.self ? "Leave" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {member.canChangeGrants ||
                (roleKey === "MEMBER" && member.permissions.length > 3) ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {EXTRA_GRANTS.map((permission) => {
                      const on = member.permissions.includes(permission);
                      return (
                        <label key={permission} className="flex min-h-9 items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!member.canChangeGrants || busy === member.id}
                            onChange={(event) => onGrant(member, permission, event.target.checked)}
                          />
                          {PERMISSION_LABELS[permission]}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {canManagePeople ? (
        <section className="card p-5">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["invite", "Invite link"],
                ["create", "Create login"],
                ["attach", "Add existing"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`btn ${mode === value ? "btn-gold" : "btn-ghost"}`}
                type="button"
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onInvite}>
            {mode === "create" ? (
              <input className="field" name="name" placeholder="Full name" required minLength={2} />
            ) : null}
            <input className="field" type="email" name="email" placeholder="colleague@company.com" required />
            {mode === "create" ? (
              <input
                className="field"
                type="password"
                name="password"
                placeholder="Temporary password"
                required
                minLength={8}
              />
            ) : null}
            <select className="field" name="role" defaultValue={defaultKey}>
              {choices.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
            <button className="btn btn-gold sm:col-span-2 sm:w-fit" type="submit" disabled={busy === "add"}>
              {mode === "invite" ? "Send invite" : mode === "attach" ? "Add existing" : "Create login"}
            </button>
          </form>
          {inviteUrl ? (
            <div className="mt-4 rounded-2xl bg-bg p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gold">Copy this link</p>
              <p className="mono mt-2 break-all text-sm">{inviteUrl}</p>
              <button
                className="btn btn-ghost mt-3"
                type="button"
                onClick={() => navigator.clipboard.writeText(inviteUrl)}
              >
                Copy
              </button>
            </div>
          ) : null}
          {invites.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-gold">
                      {(invite.roleRef?.name ?? invite.role).toLowerCase()} · expires{" "}
                      {formatDateTime(invite.expiresAt, "UTC")}
                    </p>
                  </div>
                  <button className="text-xs text-rose" type="button" onClick={() => revoke(invite.id)}>
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-dim">No pending invites.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
