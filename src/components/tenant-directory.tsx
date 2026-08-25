"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { enterCustomerAction } from "@/app/actions/admin";
import { DeleteTenantButton } from "@/components/delete-tenant-button";
import { formatDateTime } from "@/lib/format";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  createdAt: Date | string;
  failing: number;
  _count: { jobs: number; memberships: number; runs: number };
  memberships: { user: { email: string; name: string } }[];
};

type SortKey = "name" | "jobs" | "failing" | "users" | "created";

export function TenantDirectory({ tenants }: { tenants: Tenant[] }) {
  const [q, setQ] = useState("");
  const [failingOnly, setFailingOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "created",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = tenants;
    if (needle) {
      rows = rows.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(needle) ||
          tenant.slug.toLowerCase().includes(needle) ||
          tenant.memberships.some((row) => row.user.email.toLowerCase().includes(needle)),
      );
    }
    if (failingOnly) rows = rows.filter((tenant) => tenant.failing > 0);
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      if (sort.key === "jobs") return (a._count.jobs - b._count.jobs) * dir;
      if (sort.key === "failing") return (a.failing - b.failing) * dir;
      if (sort.key === "users") return (a._count.memberships - b._count.memberships) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return copy;
  }, [failingOnly, q, sort, tenants]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  function toggle(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="field max-w-sm"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(0);
          }}
          placeholder="Search tenants…"
          aria-label="Search tenants"
        />
        <label className="flex items-center gap-2 text-sm text-ink-dim">
          <input
            type="checkbox"
            checked={failingOnly}
            onChange={(event) => {
              setFailingOnly(event.target.checked);
              setPage(0);
            }}
          />
          Failing only
        </label>
        <p className="text-sm text-ink-dim">
          {filtered.length} of {tenants.length}
        </p>
      </div>
      {filtered.length === 0 ? (
        <div className="card p-8 text-ink-dim">No tenants match that search.</div>
      ) : (
        <div className="overflow-hidden rounded-[1.25rem] border border-line">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-bg-mute text-xs uppercase tracking-[0.14em] text-ink-dim">
              <tr>
                {(
                  [
                    ["name", "Tenant"],
                    ["jobs", "Jobs"],
                    ["failing", "Failing"],
                    ["users", "Users"],
                    ["created", "Created"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="px-4 py-3 font-medium">
                    <button type="button" onClick={() => toggle(key)}>
                      {label}
                      {sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((customer) => (
                <tr key={customer.id} className="border-t border-line bg-bg-elev/70">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tenants/${customer.id}`} className="font-medium hover:text-gold">
                      {customer.name}
                    </Link>
                    <p className="mono text-xs text-ink-dim">{customer.slug}</p>
                  </td>
                  <td className="px-4 py-3">{customer._count.jobs}</td>
                  <td className={`px-4 py-3 ${customer.failing ? "text-rose" : ""}`}>
                    {customer.failing}
                  </td>
                  <td className="px-4 py-3">{customer._count.memberships}</td>
                  <td className="px-4 py-3 text-xs text-ink-dim">
                    {formatDateTime(customer.createdAt, customer.timezone)}
                    <p>{customer.memberships[0]?.user.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/tenants/${customer.id}`} className="btn btn-ghost btn-sm">
                        Manage
                      </Link>
                      <form action={enterCustomerAction}>
                        <input type="hidden" name="tenantId" value={customer.id} />
                        <button className="btn btn-gold btn-sm" type="submit">
                          Open
                        </button>
                      </form>
                      <DeleteTenantButton id={customer.id} name={customer.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          <button className="btn btn-ghost btn-sm" type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span className="text-ink-dim">
            {current + 1} / {pages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
