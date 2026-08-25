"use client";

import { useActionState, useState } from "react";
import { createPlatformUserAction } from "@/app/actions/admin";

type Tenant = { id: string; name: string; slug: string };

export function PlatformUserForm({
  tenants,
  defaultTenantId,
  lockedEmail,
  forceAttach = false,
}: {
  tenants: Tenant[];
  defaultTenantId?: string;
  lockedEmail?: string;
  forceAttach?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createPlatformUserAction, null);
  const [mode, setMode] = useState<"create" | "attach">(forceAttach ? "attach" : "create");

  return (
    <form action={formAction} className="space-y-4">
      {forceAttach ? null : (
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn ${mode === "create" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setMode("create")}
          >
            New login
          </button>
          <button
            className={`btn ${mode === "attach" ? "btn-gold" : "btn-ghost"}`}
            type="button"
            onClick={() => setMode("attach")}
          >
            Existing account
          </button>
        </div>
      )}
      {mode === "create" ? (
        <label className="block">
          <span className="field-label">Full name</span>
          <input className="field" name="name" required minLength={2} />
        </label>
      ) : null}
      <label className="block">
        <span className="field-label">Email</span>
        <input
          className="field"
          type="email"
          name="email"
          required
          defaultValue={lockedEmail}
          readOnly={Boolean(lockedEmail)}
        />
      </label>
      {mode === "create" ? (
        <label className="block">
          <span className="field-label">Temporary password</span>
          <input className="field" type="password" name="password" required minLength={8} />
        </label>
      ) : (
        <p className="text-sm text-ink-dim">
          Adds this email to the selected tenant. No new password is created.
        </p>
      )}
      <label className="block">
        <span className="field-label">Tenant</span>
        <select className="field" name="tenantId" defaultValue={defaultTenantId ?? tenants[0]?.id ?? ""} required>
          {tenants.length === 0 ? <option value="">No tenants yet</option> : null}
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name} ({tenant.slug})
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="field-label">Role</span>
        <select className="field" name="role" defaultValue="MEMBER">
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
          <option value="OWNER">Owner</option>
        </select>
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold" type="submit" disabled={pending || tenants.length === 0}>
        {pending ? "Saving…" : mode === "attach" ? "Add to tenant" : "Create user"}
      </button>
    </form>
  );
}
