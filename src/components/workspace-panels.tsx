"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Group = {
  id: string;
  name: string;
  color: string;
  _count: { jobs: number };
};
type Secret = { id: string; name: string; key: string; createdAt: Date | string };

export function WorkspacePanels({
  groups,
  secrets,
  canManage,
  canManageSecrets,
}: {
  groups: Group[];
  secrets: Secret[];
  canManage: boolean;
  canManageSecrets: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    router.refresh();
  }

  async function addGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: data.name, color: data.color }),
    });
    if (response.ok) {
      form.reset();
      refresh();
    }
  }

  async function removeGroup(id: string) {
    if (!confirm("Delete this group? Jobs stay, they become ungrouped.")) return;
    await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
    refresh();
  }

  async function addSecret(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/secrets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error ?? "Could not save secret");
      return;
    }
    form.reset();
    setMessage("Secret stored. Use {{SECRET:KEY}} in URL, headers, or body.");
    refresh();
  }

  async function removeSecret(id: string) {
    if (!confirm("Delete this secret? Jobs that interpolate it will fail.")) return;
    await fetch(`/api/secrets?id=${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="font-display text-2xl">Groups</h2>
        <p className="mt-1 text-sm text-ink-dim">Folders for ops, billing, and integrations.</p>
        <ul className="mt-5 space-y-3">
          {groups.map((group) => (
            <li key={group.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: group.color }}
                />
                <span>{group.name}</span>
                <span className="text-xs text-ink-dim">{group._count.jobs}</span>
              </div>
              {canManage ? (
                <button
                  className="text-xs text-rose"
                  type="button"
                  onClick={() => removeGroup(group.id)}
                >
                  Delete
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canManage ? (
          <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_120px_auto]" onSubmit={addGroup}>
            <input className="field" name="name" placeholder="Group name" required />
            <input
              className="field mono"
              name="color"
              placeholder="#7dffce"
              defaultValue="#7dffce"
            />
            <button className="btn btn-ghost" type="submit">
              Add
            </button>
          </form>
        ) : null}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Secrets</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Encrypted at rest. Interpolate with <span className="mono text-gold-2">{"{{SECRET:API_TOKEN}}"}</span>
        </p>
        {canManageSecrets ? (
          <>
            <ul className="mt-5 space-y-3">
              {secrets.length === 0 ? (
                <li className="text-sm text-ink-dim">None yet.</li>
              ) : (
                secrets.map((secret) => (
                  <li key={secret.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{secret.name}</p>
                      <p className="mono text-xs text-ink-dim">{secret.key}</p>
                    </div>
                    <button
                      className="text-xs text-rose"
                      type="button"
                      onClick={() => removeSecret(secret.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))
              )}
            </ul>
            <form className="mt-5 space-y-3" onSubmit={addSecret}>
              <input className="field" name="name" placeholder="Display name" required />
              <input className="field mono" name="key" placeholder="API_TOKEN" required />
              <input className="field" name="value" type="password" placeholder="Value" required />
              <button className="btn btn-ghost" type="submit">
                Store secret
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-ink-dim">You do not have permission to manage secrets.</p>
        )}
        {message ? <p className="mt-4 text-sm text-ink-dim">{message}</p> : null}
      </section>
    </div>
  );
}
