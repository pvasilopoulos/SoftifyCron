"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/toaster";
import { formatDateTime } from "@/lib/format";
import {
  EXTRA_GRANTS,
  PERMISSION_LABELS,
  parseGrants,
  rolePermissions,
  type Permission,
} from "@/lib/acl";

type Member = {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
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

export function PeopleBoard({
  members,
  invites,
  canManagePeople,
  actorRole,
  allowOwnerRole = false,
  endpoints = DEFAULT_ENDPOINTS,
}: {
  members: Member[];
  invites: Invite[];
  canManagePeople: boolean;
  actorRole: string;
  allowOwnerRole?: boolean;
  endpoints?: PeopleEndpoints;
}) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"invite" | "create" | "attach">("invite");
  const [busy, setBusy] = useState<string | null>(null);

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

  async function onRole(id: string, role: string) {
    setBusy(id);
    try {
      await patchMember(id, { role });
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
      <section className="card p-6">
        <h2 className="font-display text-2xl italic">People</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Roles set the baseline. Extra permissions can be granted to members without promoting them
          to admin.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {(["OWNER", "ADMIN", "MEMBER"] as const).map((role) => (
            <div key={role} className="rounded-2xl border border-line bg-bg p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gold">{role.toLowerCase()}</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-dim">
                {rolePermissions(role).map((permission) => (
                  <li key={permission}>{PERMISSION_LABELS[permission]}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {members.map((member) => (
          <article key={member.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {member.name}
                  {member.self ? <span className="ml-2 text-xs text-gold">you</span> : null}
                </p>
                <p className="text-sm text-ink-dim">{member.email}</p>
                <p className="mt-1 text-xs text-ink-dim">
                  Joined {formatDateTime(member.createdAt, "UTC")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {member.canChangeRole ? (
                  <select
                    className="field max-w-40"
                    value={member.role}
                    disabled={busy === member.id}
                    onChange={(event) => onRole(member.id, event.target.value)}
                  >
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-gold/12 px-3 py-1 text-xs uppercase tracking-[0.14em] text-gold">
                    {member.role.toLowerCase()}
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
            {member.role === "MEMBER" && (member.canChangeGrants || member.permissions.length > 0) ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {EXTRA_GRANTS.map((permission) => {
                  const locked = rolePermissions("MEMBER").includes(permission);
                  const on = member.permissions.includes(permission);
                  return (
                    <label key={permission} className="flex min-h-10 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={locked || !member.canChangeGrants || busy === member.id}
                        onChange={(event) => onGrant(member, permission, event.target.checked)}
                      />
                      {PERMISSION_LABELS[permission]}
                    </label>
                  );
                })}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {canManagePeople ? (
        <section className="card p-6">
          <div className="flex flex-wrap gap-2">
            <button
              className={`btn ${mode === "invite" ? "btn-gold" : "btn-ghost"}`}
              type="button"
              onClick={() => setMode("invite")}
            >
              Invite link
            </button>
            <button
              className={`btn ${mode === "create" ? "btn-gold" : "btn-ghost"}`}
              type="button"
              onClick={() => setMode("create")}
            >
              Create login
            </button>
            <button
              className={`btn ${mode === "attach" ? "btn-gold" : "btn-ghost"}`}
              type="button"
              onClick={() => setMode("attach")}
            >
              Add existing
            </button>
          </div>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={onInvite}>
            {mode === "create" ? (
              <input className="field" name="name" placeholder="Full name" required minLength={2} />
            ) : null}
            <input className="field" type="email" name="email" placeholder="colleague@company.com" required />
            {mode === "create" ? (
              <input className="field" type="password" name="password" placeholder="Temporary password" required minLength={8} />
            ) : null}
            <select className="field" name="role" defaultValue="MEMBER">
              <option value="MEMBER">Member</option>
              {actorRole === "OWNER" || allowOwnerRole ? <option value="ADMIN">Admin</option> : null}
              {allowOwnerRole ? <option value="OWNER">Owner</option> : null}
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
          <ul className="mt-5 space-y-3">
            {invites.length === 0 ? (
              <li className="text-sm text-ink-dim">No pending invites.</li>
            ) : (
              invites.map((invite) => (
                <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-gold">
                      {invite.role.toLowerCase()} · expires {formatDateTime(invite.expiresAt, "UTC")}
                    </p>
                  </div>
                  <button className="text-xs text-rose" type="button" onClick={() => revoke(invite.id)}>
                    Revoke
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
