"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  persistDensity,
  persistTheme,
  readDensity,
  readThemePreference,
  type DensityPreference,
  type ThemePreference,
} from "@/lib/theme";

type Hit = { href: string; label: string; hint?: string };

const STATIC: Hit[] = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create workspace" },
  { href: "/dashboard", label: "Overview" },
  { href: "/jobs", label: "Jobs" },
  { href: "/jobs/new", label: "New job" },
  { href: "/runs", label: "Runs" },
  { href: "/responses", label: "Responses" },
  { href: "/inbox", label: "Inbox" },
  { href: "/calendar", label: "Calendar" },
  { href: "/usage", label: "Usage" },
  { href: "/audit", label: "Workspace audit" },
  { href: "/settings", label: "Workspace settings" },
  { href: "/settings#docs", label: "Workspace docs and API" },
  { href: "/settings#security", label: "API tokens" },
  { href: "/settings#security", label: "Client portals" },
  { href: "/settings#people", label: "People and roles" },
  { href: "/settings#roles", label: "Roles" },
  { href: "/admin", label: "Tenants" },
  { href: "/admin/monitor", label: "Monitor" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/tenants/new", label: "New tenant" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/users/new", label: "New user" },
];

function cycleTheme() {
  const order: ThemePreference[] = ["dark", "light", "system"];
  const current = readThemePreference();
  const next = order[(order.indexOf(current) + 1) % order.length] ?? "system";
  persistTheme(next);
}

function cycleDensity() {
  const next: DensityPreference = readDensity() === "compact" ? "comfortable" : "compact";
  persistDensity(next);
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const portal = pathname === "/portal" || pathname.startsWith("/portal/");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Hit[]>([]);
  const [index, setIndex] = useState(0);
  const [openedOn, setOpenedOn] = useState(pathname);

  useEffect(() => {
    function open() {
      if (portal) return;
      setQ("");
      setIndex(0);
      setOpenedOn(pathname);
      setOpen(true);
    }
    function onKey(event: KeyboardEvent) {
      if (portal) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => {
          const actuallyOpen = value && openedOn === pathname;
          const next = !actuallyOpen;
          if (next) {
            setQ("");
            setIndex(0);
            setOpenedOn(pathname);
          }
          return next;
        });
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("sc-open-palette", open);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("sc-open-palette", open);
    };
  }, [openedOn, pathname, portal]);

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (!query) return;
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/jobs?q=${encodeURIComponent(query)}`);
        if (!response.ok) return;
        const data = (await response.json()) as { jobs?: { id: string; name: string }[] };
        setJobs(
          (data.jobs ?? []).slice(0, 8).map((job) => ({
            href: `/jobs/${job.id}`,
            label: job.name,
            hint: "Job",
          })),
        );
      } catch {
        /* public pages have no session */
      }
    }, 160);
    return () => window.clearTimeout(handle);
  }, [open, q]);

  const visible = !portal && open && openedOn === pathname;

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const jobHits = needle ? jobs : [];
    const actions: Hit[] = [
      { href: "#theme", label: "Cycle color theme", hint: "Action" },
      { href: "#density", label: "Toggle compact density", hint: "Action" },
    ];
    const base = [...actions, ...STATIC.filter((item) => item.href !== pathname), ...jobHits];
    const unique = new Map<string, Hit>();
    for (const item of base) unique.set(`${item.href}:${item.label}`, item);
    const list = [...unique.values()];
    if (!needle) return list.slice(0, 8);
    return list.filter((item) => item.label.toLowerCase().includes(needle)).slice(0, 10);
  }, [jobs, pathname, q]);

  const active = hits.length === 0 ? 0 : Math.min(index, hits.length - 1);

  function go(hit: Hit | undefined) {
    if (!hit) return;
    if (hit.href === "#theme") {
      cycleTheme();
      setOpen(false);
      return;
    }
    if (hit.href === "#density") {
      cycleDensity();
      setOpen(false);
      return;
    }
    setOpen(false);
    router.push(hit.href);
  }

  if (!visible) return null;

  return (
    <div className="palette-backdrop" onClick={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          className="field"
          autoFocus
          value={q}
          placeholder="Jump to a page or job… ⌘K"
          onChange={(event) => {
            setQ(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((value) => Math.min(value + 1, Math.max(hits.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((value) => Math.max(value - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(hits[active]);
            }
          }}
        />
        <ul>
          {hits.length === 0 ? (
            <li className="text-sm text-ink-dim">No matches</li>
          ) : (
            hits.map((hit, i) => (
              <li key={`${hit.href}-${hit.label}`}>
                <button
                  type="button"
                  className={i === active ? "is-on" : ""}
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(hit)}
                >
                  <span>{hit.label}</span>
                  {hit.hint ? <span className="hint">{hit.hint}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
