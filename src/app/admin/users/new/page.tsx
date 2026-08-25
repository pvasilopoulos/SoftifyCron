import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlatformUserForm } from "@/components/platform-user-form";

export const metadata = { title: "New user" };

export default async function NewPlatformUserPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
          ← Users
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
        <h1 className="mt-2 font-display text-4xl">New user</h1>
        <p className="mt-2 max-w-2xl text-ink-dim">
          Every customer user belongs to at least one tenant. Create a login or attach an existing
          email.
        </p>
      </div>
      <section className="card p-6 max-w-lg">
        {tenants.length === 0 ? (
          <p className="text-sm text-ink-dim">
            Create a{" "}
            <Link href="/admin/tenants/new" className="text-gold">
              tenant
            </Link>{" "}
            first, then add people to it.
          </p>
        ) : (
          <PlatformUserForm tenants={tenants} defaultTenantId={params.tenantId} />
        )}
      </section>
    </div>
  );
}
