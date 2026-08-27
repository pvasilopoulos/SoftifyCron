"use client";

import { useState } from "react";

type Group = { id: string; name: string; color: string };
type Client = {
  id: string;
  name: string;
  email: string;
  logoUrl: string | null;
  tokenPrefix: string;
  lastSeenAt: Date | string | null;
  groups: { id: string; name: string; color: string }[];
  url?: string;
  raw?: string;
};

function when(value: Date | string | null) {
  if (!value) return "never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "never" : date.toLocaleString();
}

export function PortalClientsPanel({
  clients,
  groups,
  canEdit,
  mailReady = false,
  ungroupedJobs = 0,
}: {
  clients: Client[];
  groups: Group[];
  canEdit: boolean;
  mailReady?: boolean;
  ungroupedJobs?: number;
}) {
  const [rows, setRows] = useState(clients);
  const [revealed, setRevealed] = useState<{ id: string; url: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setStatus(null);
    const response = await fetch("/api/portal/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        logoUrl: String(data.get("logoUrl") ?? ""),
        groupIds: data.getAll("groupIds").map(String),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Could not create client");
      return;
    }
    setRows((current) => [payload.client, ...current]);
    setRevealed({ id: payload.client.id, url: payload.client.url });
    form.reset();
  }

  async function save(id: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setStatus(null);
    const response = await fetch(`/api/portal/clients/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        logoUrl: String(data.get("logoUrl") ?? ""),
        groupIds: data.getAll("groupIds").map(String),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(payload.error ?? "Could not save client");
      return;
    }
    setRows((current) => current.map((row) => (row.id === id ? payload.client : row)));
    setEditing(null);
    setStatus("Saved. The durable link did not change.");
  }

  async function rotate(id: string) {
    if (
      !confirm(
        "Rotate this client’s magic link? The current URL and any signed-in portal sessions stop working immediately. Copy the new URL — it is shown once.",
      )
    ) {
      return;
    }
    setStatus(null);
    const response = await fetch(`/api/portal/clients/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "rotate" }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error ?? "Could not rotate");
      return;
    }
    setRows((current) => current.map((row) => (row.id === id ? payload.client : row)));
    setRevealed({ id, url: payload.client.url });
  }

  async function emailLink(id: string) {
    setStatus(null);
    const response = await fetch(`/api/portal/clients/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "email" }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error ?? "Could not email link");
      return;
    }
    setStatus(`Sent a 24-hour login to ${payload.sent} mailbox${payload.sent === 1 ? "" : "es"}.`);
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this client portal? The magic link stops working immediately.")) return;
    setStatus(null);
    const response = await fetch(`/api/portal/clients/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.error ?? "Could not revoke");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    setRevealed((current) => (current?.id === id ? null : current));
    if (editing === id) setEditing(null);
  }

  return (
    <section className="card p-6">
      <h2 className="font-display text-2xl">Client portals</h2>
      <p className="mt-2 text-sm text-ink-dim">
        One magic link per customer, bound to job groups. The durable URL is shown once — copy it now, or Rotate later
        for a new one (that signs the old link and cookies out). Prefer Email link so the secret is not in the address
        bar.
      </p>
      {ungroupedJobs > 0 ? (
        <p className="mt-3 text-sm text-ink-dim">
          {ungroupedJobs} job{ungroupedJobs === 1 ? "" : "s"} have no group and will not appear in any client portal.
          Assign them in Workspace first.
        </p>
      ) : null}
      {!mailReady ? (
        <p className="mt-3 text-sm text-ink-dim">
          Email login needs SMTP under Notifications. Until then, send the durable <span className="mono">/portal/pt_…</span>{" "}
          URL yourself.
        </p>
      ) : null}
      {groups.length === 0 ? (
        <p className="mt-4 text-sm text-ink-dim">Create a job group in Workspace first, then attach a client to it.</p>
      ) : null}
      {canEdit && groups.length > 0 ? (
        <form className="mt-5 space-y-4" onSubmit={create}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="name" placeholder="Acme Ops" required minLength={2} />
            <input className="field" name="email" placeholder="ops@client.com, cto@client.com" />
            <input className="field sm:col-span-2" name="logoUrl" placeholder="https://client.com/logo.svg (optional)" />
          </div>
          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="mb-1 text-xs uppercase tracking-[0.16em] text-ink-dim">Job groups</legend>
            {groups.map((group) => (
              <label key={group.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="groupIds" value={group.id} />
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: group.color }} />
                {group.name}
              </label>
            ))}
          </fieldset>
          <button className="btn btn-gold" type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create client portal"}
          </button>
        </form>
      ) : null}
      {revealed ? (
        <div className="mt-4 rounded-2xl bg-bg p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-gold">Shown once — copy now</p>
          <input
            className="field mono mt-2 text-sm"
            readOnly
            value={revealed.url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            className="btn btn-ghost btn-sm mt-3"
            type="button"
            onClick={() => void navigator.clipboard.writeText(revealed.url)}
          >
            Copy link
          </button>
        </div>
      ) : null}
      {status ? <p className="mt-3 text-sm text-ink-dim">{status}</p> : null}
      <ul className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <li className="text-sm text-ink-dim">
            {canEdit ? "No client portals yet." : "No client portals, or you cannot view them."}
          </li>
        ) : (
          rows.map((client) => (
            <li key={client.id} className="border-b border-line pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="mono text-xs text-ink-dim">{client.tokenPrefix}…</p>
                  <p className="mt-1 text-xs text-ink-dim">
                    {client.groups.map((group) => group.name).join(", ") || "no groups — jobs will be hidden"}
                    {client.email ? ` · ${client.email}` : ""}
                  </p>
                  <p className="text-xs text-ink-dim">Last seen {when(client.lastSeenAt)}</p>
                </div>
                {canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setEditing((current) => (current === client.id ? null : client.id))}
                    >
                      {editing === client.id ? "Close" : "Edit"}
                    </button>
                    {client.email ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        disabled={!mailReady}
                        title={mailReady ? "Send a 24-hour login" : "Set SMTP in Notifications first"}
                        onClick={() => void emailLink(client.id)}
                      >
                        Email link
                      </button>
                    ) : null}
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => void rotate(client.id)}>
                      Rotate
                    </button>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => void revoke(client.id)}>
                      Revoke
                    </button>
                  </div>
                ) : null}
              </div>
              {editing === client.id && canEdit ? (
                <form className="mt-4 space-y-3" onSubmit={(event) => void save(client.id, event)}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="field" name="name" defaultValue={client.name} required minLength={2} />
                    <input className="field" name="email" defaultValue={client.email} placeholder="ops@client.com" />
                    <input
                      className="field sm:col-span-2"
                      name="logoUrl"
                      defaultValue={client.logoUrl ?? ""}
                      placeholder="https://client.com/logo.svg (optional)"
                    />
                  </div>
                  <fieldset className="grid gap-2 sm:grid-cols-2">
                    <legend className="mb-1 text-xs uppercase tracking-[0.16em] text-ink-dim">Job groups</legend>
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="groupIds"
                          value={group.id}
                          defaultChecked={client.groups.some((item) => item.id === group.id)}
                        />
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: group.color }} />
                        {group.name}
                      </label>
                    ))}
                  </fieldset>
                  <button className="btn btn-gold btn-sm" type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save client"}
                  </button>
                </form>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
