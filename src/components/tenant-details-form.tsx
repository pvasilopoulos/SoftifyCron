"use client";

import { useActionState } from "react";
import { updateCustomerAction } from "@/app/actions/admin";
import { TIMEZONES } from "@/lib/format";

export function TenantDetailsForm({
  tenantId,
  name,
  timezone,
}: {
  tenantId: string;
  name: string;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(updateCustomerAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <label className="block">
        <span className="field-label">Tenant name</span>
        <input className="field" name="name" defaultValue={name} required minLength={2} />
      </label>
      <label className="block">
        <span className="field-label">Timezone</span>
        <select className="field" name="timezone" defaultValue={timezone}>
          {TIMEZONES.map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save tenant"}
      </button>
    </form>
  );
}
