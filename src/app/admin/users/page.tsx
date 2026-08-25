import Link from "next/link";
import { listPlatformUsers } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const users = await listPlatformUsers(q || undefined);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Platform</p>
          <h1 className="mt-2 font-display text-4xl">Users</h1>
          <p className="mt-2 max-w-2xl text-ink-dim">
            Create a login and put it in a tenant, or attach an existing account to another
            customer space.
          </p>
        </div>
        <Link href="/admin/users/new" className="btn btn-gold">
          New user
        </Link>
      </div>

      <form className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="field"
            name="q"
            defaultValue={q}
            placeholder="Search name or email…"
            aria-label="Search users"
          />
          <button className="btn btn-gold" type="submit">
            Search
          </button>
        </div>
      </form>

      <section className="space-y-3">
        {users.length === 0 ? (
          <div className="card p-8 text-ink-dim">
            {q ? "No users match." : "No customer users yet."}
          </div>
        ) : (
          users.map((user) => (
            <article key={user.id} className="card card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/admin/users/${user.id}`} className="font-medium hover:text-gold">
                    {user.name}
                  </Link>
                  <p className="text-sm text-ink-dim">{user.email}</p>
                  <p className="mt-2 text-xs text-ink-dim">
                    Joined {formatDateTime(user.createdAt, "UTC")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.memberships.length === 0 ? (
                      <span className="text-xs text-ink-dim">No tenant</span>
                    ) : (
                      user.memberships.map((membership) => (
                        <Link
                          key={membership.id}
                          href={`/admin/tenants/${membership.tenant.id}`}
                          className="rounded-full bg-bg-mute px-2.5 py-1 text-xs"
                        >
                          {membership.tenant.name} · {membership.role.toLowerCase()}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
                <Link href={`/admin/users/${user.id}`} className="btn btn-ghost">
                  Manage
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
