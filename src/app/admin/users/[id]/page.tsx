import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatformUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PlatformUserForm } from "@/components/platform-user-form";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "User" };

export default async function PlatformUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getPlatformUser(id);
  if (!user) notFound();
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  const memberOf = new Set(user.memberships.map((row) => row.tenantId));
  const available = tenants.filter((tenant) => !memberOf.has(tenant.id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/users" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
          ← Users
        </Link>
        <h1 className="mt-2 font-display text-4xl">{user.name}</h1>
        <p className="mt-1 text-ink-dim">{user.email}</p>
        <p className="mt-2 text-xs text-ink-dim">Joined {formatDateTime(user.createdAt, "UTC")}</p>
      </div>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Tenants</h2>
        <ul className="mt-5 space-y-3">
          {user.memberships.length === 0 ? (
            <li className="text-sm text-ink-dim">Not in any tenant.</li>
          ) : (
            user.memberships.map((membership) => (
              <li key={membership.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/admin/tenants/${membership.tenant.id}`} className="font-medium hover:text-gold">
                    {membership.tenant.name}
                  </Link>
                  <p className="text-xs uppercase tracking-[0.14em] text-gold">
                    {membership.role.toLowerCase()}
                  </p>
                </div>
                <Link href={`/admin/tenants/${membership.tenant.id}`} className="btn btn-ghost">
                  Manage people
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      {available.length > 0 ? (
        <section className="card p-6 max-w-lg">
          <h2 className="font-display text-2xl">Add to another tenant</h2>
          <p className="mt-2 text-sm text-ink-dim">
            Attaches {user.email} without changing their password.
          </p>
          <div className="mt-6">
            <PlatformUserForm tenants={available} lockedEmail={user.email} forceAttach />
          </div>
        </section>
      ) : null}
    </div>
  );
}
