import Link from "next/link";
import { listCustomers } from "@/lib/admin";
import { TenantDirectory } from "@/components/tenant-directory";

export const metadata = { title: "Tenants" };

export default async function AdminPage() {
  const customers = await listCustomers();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
          <h1 className="mt-2 font-display text-4xl">Tenants</h1>
          <p className="mt-2 max-w-2xl text-ink-dim">
            Create, open, edit, and delete every customer workspace. Each tenant is isolated.
          </p>
        </div>
        <Link href="/admin/tenants/new" className="btn btn-gold">
          New tenant
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="card p-8 text-ink-dim">
          No tenants yet.{" "}
          <Link href="/admin/tenants/new" className="text-gold">
            Create the first customer space.
          </Link>
        </div>
      ) : (
        <TenantDirectory
          tenants={customers.map((customer) => ({
            ...customer,
            createdAt: customer.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
