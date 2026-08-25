import Link from "next/link";
import { listCustomers } from "@/lib/admin";
import { enterCustomerAction } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Tenants" };

export default async function AdminPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
          <h1 className="mt-2 font-display text-4xl italic">Tenants</h1>
          <p className="mt-2 max-w-2xl text-ink-dim">
            Each tenant is an isolated customer space. Create the workspace here, then add users
            or open it as platform admin.
          </p>
        </div>
        <Link href="/admin/tenants/new" className="btn btn-gold">
          New tenant
        </Link>
      </div>

      <section className="space-y-3">
        {customers.length === 0 ? (
          <div className="card p-8 text-ink-dim">
            No tenants yet.{" "}
            <Link href="/admin/tenants/new" className="text-gold">
              Create the first customer space.
            </Link>
          </div>
        ) : (
          customers.map((customer) => (
            <article key={customer.id} className="card card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/admin/tenants/${customer.id}`} className="font-display text-2xl italic hover:text-gold">
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
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
