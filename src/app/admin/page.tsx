import { listCustomers } from "@/lib/admin";
import { enterCustomerAction } from "@/app/actions/admin";
import { CustomerForm } from "@/components/customer-form";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Customers" };

export default async function AdminPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
        <h1 className="mt-2 font-display text-4xl italic">Customers</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          You see every tenant. Opening a customer puts you inside their wall — their jobs,
          secrets, and members. A customer login never sees this list.
        </p>
      </div>

      <section className="space-y-3">
        {customers.length === 0 ? (
          <div className="card p-8 text-ink-dim">No customers yet.</div>
        ) : (
          customers.map((customer) => (
            <article key={customer.id} className="card card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl italic">{customer.name}</h2>
                  <p className="mono mt-1 text-xs text-ink-dim">{customer.slug}</p>
                  <p className="mt-3 text-sm text-ink-dim">
                    {customer._count.jobs} jobs · {customer._count.memberships} users ·{" "}
                    {customer.failing} failing · {customer._count.runs} runs
                  </p>
                  <p className="mt-1 text-xs text-ink-dim">
                    Owner{" "}
                    {customer.memberships[0]?.user.email ?? "—"} · created{" "}
                    {formatDateTime(customer.createdAt, customer.timezone)}
                  </p>
                </div>
                <form action={enterCustomerAction}>
                  <input type="hidden" name="tenantId" value={customer.id} />
                  <button className="btn btn-gold" type="submit">
                    Open workspace
                  </button>
                </form>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl italic">New customer</h2>
        <p className="mt-2 text-sm text-ink-dim">
          Creates an isolated tenant and an owner login that can only see that tenant.
        </p>
        <div className="mt-6 max-w-lg">
          <CustomerForm />
        </div>
      </section>
    </div>
  );
}
