"use client";

import { useMemo, useState } from "react";
import { APP_DOC_SECTIONS, searchDocSections } from "@/lib/app-docs";
import { API_ENDPOINTS, API_SCOPE_LABELS, apiCurl } from "@/lib/openapi";
import { API_SCOPES } from "@/lib/api-scopes";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        });
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Blocks({ sectionId }: { sectionId: string }) {
  const section = APP_DOC_SECTIONS.find((item) => item.id === sectionId);
  if (!section) return null;
  return (
    <div className="docs-prose">
      {section.blocks.map((block, index) => {
        if (block.type === "p") return <p key={index}>{block.text}</p>;
        if (block.type === "note") {
          return (
            <p key={index} className="docs-note">
              {block.text}
            </p>
          );
        }
        const Tag = block.type === "ol" ? "ol" : "ul";
        return (
          <Tag key={index}>
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

export function WorkspaceDocs({ origin }: { origin: string }) {
  const [q, setQ] = useState("");
  const sections = useMemo(() => searchDocSections(q), [q]);
  const apiSectionVisible = !q || sections.some((item) => item.id === "api");

  return (
    <div className="docs-layout">
      <aside className="docs-toc">
        <label className="block text-xs uppercase tracking-[0.16em] text-ink-dim">
          Search
          <input
            className="field mt-2 w-full"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Jobs, Telegram, scopes…"
          />
        </label>
        <nav className="mt-4 flex flex-col gap-1" aria-label="Documentation">
          {APP_DOC_SECTIONS.map((section) => (
            <a key={section.id} className="docs-toc-link" href={`#docs-${section.id}`}>
              {section.title}
            </a>
          ))}
          <a className="docs-toc-link" href="#docs-reference">
            API reference
          </a>
        </nav>
      </aside>

      <div className="space-y-4">
        {sections.map((section) => (
          <article key={section.id} id={`docs-${section.id}`} className="card p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">{section.kicker}</p>
            <h2 className="mt-1 font-display text-2xl">{section.title}</h2>
            <div className="mt-4">
              <Blocks sectionId={section.id} />
            </div>
          </article>
        ))}

        {apiSectionVisible ? (
          <article id="docs-reference" className="card p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-gold">Integrations</p>
            <h2 className="mt-1 font-display text-2xl">API reference</h2>
            <p className="mt-2 text-sm text-ink-dim">
              Base <span className="mono">{origin}/api/v1</span>. OpenAPI at{" "}
              <a className="text-gold" href="/api/v1/openapi">
                /api/v1/openapi
              </a>
              .
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Scope</th>
                    <th>What it allows</th>
                  </tr>
                </thead>
                <tbody>
                  {API_SCOPES.map((scope) => (
                    <tr key={scope}>
                      <td className="mono">{scope}</td>
                      <td>{API_SCOPE_LABELS[scope].hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-4">
              {API_ENDPOINTS.map((endpoint) => {
                const curl = apiCurl(origin, endpoint);
                return (
                  <section key={endpoint.id} className="docs-endpoint">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="docs-method">{endpoint.method}</span>
                      <span className="mono text-sm">/api/v1{endpoint.path}</span>
                      {endpoint.scope ? (
                        <span className="docs-scope">{endpoint.scope}</span>
                      ) : (
                        <span className="docs-scope is-open">public</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium">{endpoint.summary}</h3>
                    <p className="mt-1 text-sm text-ink-dim">{endpoint.description}</p>
                    {endpoint.params?.length ? (
                      <ul className="mt-2 text-sm text-ink-dim">
                        {endpoint.params.map((param) => (
                          <li key={`${param.in}-${param.name}`}>
                            <span className="mono">{param.name}</span> ({param.in}
                            {param.required ? ", required" : ""}) — {param.description}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 flex items-start justify-between gap-2 rounded-2xl bg-bg p-3">
                      <pre className="docs-pre">{curl}</pre>
                      <CopyButton text={curl} />
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        ) : null}

        {sections.length === 0 ? (
          <p className="text-sm text-ink-dim">No matching topics. Try “heartbeat”, “scopes”, or “inbox”.</p>
        ) : null}
      </div>
    </div>
  );
}
