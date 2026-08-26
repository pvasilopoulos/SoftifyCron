"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_TELEGRAM_TEMPLATE,
  interpolateNotifyTemplate,
  NOTIFY_PLACEHOLDERS,
  sampleNotifyVars,
} from "@/lib/notify-template";

export type TelegramTemplateRow = {
  id: string;
  name: string;
  body: string;
  _count?: { jobs: number };
};

export function TelegramTemplatesPanel({
  initial,
  canEdit,
}: {
  initial: TelegramTemplateRow[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [activeId, setActiveId] = useState<string | "new">(initial[0]?.id ?? "new");
  const [name, setName] = useState(initial[0]?.name ?? "");
  const [body, setBody] = useState(initial[0]?.body ?? DEFAULT_TELEGRAM_TEMPLATE);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const active = activeId === "new" ? null : rows.find((row) => row.id === activeId) ?? null;
  const preview = useMemo(() => interpolateNotifyTemplate(body, sampleNotifyVars()), [body]);

  function select(row: TelegramTemplateRow | "new") {
    setStatus(null);
    if (row === "new") {
      setActiveId("new");
      setName("");
      setBody(DEFAULT_TELEGRAM_TEMPLATE);
      return;
    }
    setActiveId(row.id);
    setName(row.name);
    setBody(row.body);
  }

  function insertPlaceholder(key: string) {
    setBody((current) => `${current}${current.endsWith("\n") || current.length === 0 ? "" : " "}{{${key}}}`);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const creating = activeId === "new";
    const response = await fetch(creating ? "/api/notify-templates" : `/api/notify-templates/${activeId}`, {
      method: creating ? "POST" : "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, body }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(data.error ?? "Could not save template");
      return;
    }
    const saved = data.template as TelegramTemplateRow;
    setRows((current) => {
      const next = creating
        ? [...current, { ...saved, _count: saved._count ?? { jobs: 0 } }]
        : current.map((row) =>
            row.id === saved.id ? { ...row, ...saved, _count: row._count ?? saved._count } : row,
          );
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setActiveId(saved.id);
    setName(saved.name);
    setBody(saved.body);
    setStatus(creating ? "Template created" : "Template saved");
  }

  async function remove() {
    if (activeId === "new") return;
    if (!confirm("Delete this Telegram template?")) return;
    setPending(true);
    setStatus(null);
    const response = await fetch(`/api/notify-templates/${activeId}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setStatus(data.error ?? "Could not delete template");
      return;
    }
    const remaining = rows.filter((row) => row.id !== activeId);
    setRows(remaining);
    if (remaining[0]) select(remaining[0]);
    else select("new");
    setStatus("Template deleted");
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-2xl">Telegram templates</h2>
      <p className="mt-1 text-sm text-ink-dim">
        Write the Telegram body once, then pick it on each job. Unknown placeholders become empty. Email, Slack, and
        Discord still use the built-in message.
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[14rem_1fr]">
        <div>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  className={`w-full rounded-2xl px-3 py-2 text-left text-sm ${
                    row.id === activeId ? "bg-gold/15 text-gold-2" : "hover:bg-bg-mute"
                  }`}
                  type="button"
                  onClick={() => select(row)}
                >
                  {row.name}
                  {row._count?.jobs ? (
                    <span className="mt-0.5 block text-xs text-ink-dim">{row._count.jobs} jobs</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {canEdit ? (
            <button className="btn btn-ghost btn-sm mt-3" type="button" onClick={() => select("new")}>
              New template
            </button>
          ) : null}
        </div>
        <form className="space-y-4" onSubmit={save}>
          <label className="block">
            <span className="field-label">Name</span>
            <input
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canEdit}
              maxLength={80}
              required
              placeholder="Ops failure"
            />
          </label>
          <label className="block">
            <span className="field-label">Message body</span>
            <textarea
              className="field min-h-48 mono"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={!canEdit}
              maxLength={4000}
              required
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {NOTIFY_PLACEHOLDERS.map((key) => (
              <button
                key={key}
                className="rounded-full bg-bg-mute px-2.5 py-1 font-mono text-[11px] text-ink-dim"
                type="button"
                disabled={!canEdit}
                onClick={() => insertPlaceholder(key)}
              >
                {`{{${key}}}`}
              </button>
            ))}
          </div>
          <div>
            <p className="field-label">Preview</p>
            <pre className="mono mt-2 whitespace-pre-wrap rounded-2xl bg-bg p-4 text-xs text-gold-2">{preview || "—"}</pre>
          </div>
          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-gold" type="submit" disabled={pending}>
                {pending ? "Saving…" : active ? "Save template" : "Create template"}
              </button>
              {active ? (
                <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => void remove()}>
                  Delete
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-ink-dim">You do not have permission to edit templates.</p>
          )}
          {status ? <p className="text-sm text-ink-dim">{status}</p> : null}
        </form>
      </div>
    </section>
  );
}
