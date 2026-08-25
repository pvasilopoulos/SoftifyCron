"use client";

import { useActionState } from "react";
import { createCustomerAction } from "@/app/actions/admin";
import { TIMEZONES } from "@/lib/format";

export function CustomerForm() {
  const [state, formAction, pending] = useActionState(createCustomerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="field-label">Customer name</span>
        <input className="field" name="name" required minLength={2} placeholder="Helios Labs" />
      </label>
      <label className="block">
        <span className="field-label">Owner name</span>
        <input className="field" name="ownerName" required minLength={2} />
      </label>
      <label className="block">
        <span className="field-label">Owner email</span>
        <input className="field" type="email" name="ownerEmail" required />
      </label>
      <label className="block">
        <span className="field-label">Owner password</span>
        <input className="field" type="password" name="ownerPassword" required minLength={8} />
      </label>
      <label className="block">
        <span className="field-label">Timezone</span>
        <select className="field" name="timezone" defaultValue="Europe/Athens">
          {TIMEZONES.map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create customer"}
      </button>
    </form>
  );
}
