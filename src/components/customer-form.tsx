"use client";

import { useActionState, useState } from "react";
import { createCustomerAction } from "@/app/actions/admin";
import { TIMEZONES } from "@/lib/format";

export function CustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomerAction, null);
  const [mode, setMode] = useState<"create" | "attach">("create");

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="field-label">Tenant name</span>
        <input className="field" name="name" required minLength={2} placeholder="Helios Labs" />
      </label>
      <label className="block">
        <span className="field-label">Timezone</span>
        <select className="field" name="timezone" defaultValue="Europe/Athens">
          {TIMEZONES.map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </label>
      <div>
        <p className="field-label">Owner</p>
        <div className="mt-2 flex flex-wrap gap-2">
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
        <input type="hidden" name="ownerMode" value={mode} />
      </div>
      {mode === "create" ? (
        <label className="block">
          <span className="field-label">Owner name</span>
          <input className="field" name="ownerName" required minLength={2} />
        </label>
      ) : null}
      <label className="block">
        <span className="field-label">Owner email</span>
        <input className="field" type="email" name="ownerEmail" required />
      </label>
      {mode === "create" ? (
        <label className="block">
          <span className="field-label">Owner password</span>
          <input className="field" type="password" name="ownerPassword" required minLength={8} />
        </label>
      ) : (
        <p className="text-sm text-ink-dim">
          The existing account becomes owner of this new isolated tenant. They keep any other
          workspaces they already have.
        </p>
      )}
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create tenant"}
      </button>
    </form>
  );
}
