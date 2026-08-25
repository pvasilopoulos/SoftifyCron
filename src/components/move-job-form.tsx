"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Tenant = { id: string; name: string; slug: string };

export function MoveJobForm({
  jobId,
  currentTenantId,
  tenants,
}: {
  jobId: string;
  currentTenantId: string;
  tenants: Tenant[];
}) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState(currentTenantId);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (tenantId === currentTenantId) return;
    setPending(true);
    setStatus(null);
    const response = await fetch(`/api/jobs/${jobId}/move`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(data.error ?? "Move failed");
      return;
    }
    setStatus("Moved. Open the destination workspace to see it.");
    router.refresh();
  }

  return (
    <form className="card p-6 space-y-4" onSubmit={onSubmit}>
      <h2 className="font-display text-2xl">Move to tenant</h2>
      <p className="text-sm text-ink-dim">Platform only. The job leaves its group and keeps run history.</p>
      <select className="field" value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
      <button className="btn btn-ghost" type="submit" disabled={pending || tenantId === currentTenantId}>
        {pending ? "Moving…" : "Move job"}
      </button>
      {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
    </form>
  );
}
