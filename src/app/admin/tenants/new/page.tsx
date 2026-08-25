import Link from "next/link";
import { CustomerForm } from "@/components/customer-form";

export const metadata = { title: "New tenant" };

export default function NewTenantPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
          ← Tenants
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
        <h1 className="mt-2 font-display text-4xl">New tenant</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Creates an isolated customer space and an owner. The owner login can only see this
          tenant unless you add them to another one later.
        </p>
      </div>
      <section className="card p-6 max-w-lg">
        <CustomerForm />
      </section>
    </div>
  );
}
