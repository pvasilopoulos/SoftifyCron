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

export function TenantDirectory({ tenants }: { tenants: Tenant[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tenants;
    return tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(needle) ||
        tenant.slug.toLowerCase().includes(needle) ||
        tenant.memberships.some((row) => row.user.email.toLowerCase().includes(needle)),
    );
  }, [q, tenants]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="field max-w-sm"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search tenants…"
          aria-label="Search tenants"
        />
        <p className="text-sm text-ink-dim">
          {filtered.length} of {tenants.length}
        </p>
      </div>
      {filtered.length === 0 ? (
        <div className="card p-8 text-ink-dim">No tenants match that search.</div>
      ) : (
        <section className="space-y-3">
          {filtered.map((customer) => (
            <article key={customer.id} className="card card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/admin/tenants/${customer.id}`}
                    className="font-display text-2xl hover:text-gold"
                  >
                    {customer.name}
                  </Link>
                  <p className="mono mt-1 text-xs text-ink-dim">{customer.slug}</p>
                  <p className="mt-3 text-sm text-ink-dim">
                    {customer._count.jobs} jobs · {customer._count.memberships} users ·{" "}
                    {customer.failing} failing · {customer._count.runs} runs
                  </p>
                  <p className="mt-1 text-xs text-ink-dim">
                    Owner {customer.memberships[0]?.user.email ?? "—"} · created{" "}
                    {formatDateTime(customer.createdAt, customer.timezone)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/tenants/${customer.id}`} className="btn btn-ghost">
                    Manage
                  </Link>
                  <form action={enterCustomerAction}>
                    <input type="hidden" name="tenantId" value={customer.id} />
                    <button className="btn btn-gold" type="submit">
                      Open workspace
                    </button>
                  </form>
                  <DeleteTenantButton id={customer.id} name={customer.name} />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
