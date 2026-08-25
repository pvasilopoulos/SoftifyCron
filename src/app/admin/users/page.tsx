import Link from "next/link";
import { listPlatformUsers, listRoleOptions, listTenantOptions } from "@/lib/admin";
import { UserDirectory } from "@/components/user-directory";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const [users, tenants, roles] = await Promise.all([
    listPlatformUsers(q || undefined),
    listTenantOptions(),
    listRoleOptions(),
  ]);

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

      {params.error ? <p className="text-sm text-rose">{params.error}</p> : null}

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

      {users.length === 0 ? (
        <div className="card p-8 text-ink-dim">
          {q ? "No users match." : "No customer users yet."}
        </div>
      ) : (
        <UserDirectory
          users={users.map((user) => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
          }))}
          tenants={tenants}
          roles={roles}
        />
      )}
    </div>
  );
}
