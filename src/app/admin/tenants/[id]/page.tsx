import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/admin";
import { listInvites } from "@/lib/invites";
import { membersForClient } from "@/lib/members";
import { requirePlatformAdmin } from "@/lib/session";
import { enterCustomerAction } from "@/app/actions/admin";
import { listTenantRoles } from "@/lib/roles";
import { PeopleBoard } from "@/components/people-board";
import { RolesBoard } from "@/components/roles-board";
import { TenantDetailsForm } from "@/components/tenant-details-form";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Tenant" };

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePlatformAdmin();
  const { id } = await params;
  const tenant = await getCustomer(id);
  if (!tenant) notFound();
  const [members, invites, roles] = await Promise.all([
    membersForClient(id, { ...session, role: "OWNER", platform: true }),
    listInvites(id),
    listTenantRoles(id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs uppercase tracking-[0.16em] text-ink-dim">
            ← Tenants
          </Link>
          <h1 className="mt-2 font-display text-4xl italic">{tenant.name}</h1>
          <p className="mono mt-1 text-xs text-ink-dim">{tenant.slug}</p>
          <p className="mt-3 text-sm text-ink-dim">
            {tenant._count.jobs} jobs · {tenant._count.memberships} users · {tenant._count.runs}{" "}
            runs · created {formatDateTime(tenant.createdAt, tenant.timezone)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/users/new?tenantId=${tenant.id}`} className="btn btn-ghost">
            New user
          </Link>
          <form action={enterCustomerAction}>
            <input type="hidden" name="tenantId" value={tenant.id} />
            <button className="btn btn-gold" type="submit">
              Open workspace
            </button>
          </form>
        </div>
      </div>

      <section className="card p-6 max-w-lg">
        <h2 className="font-display text-2xl italic">Tenant details</h2>
        <div className="mt-6">
          <TenantDetailsForm tenantId={tenant.id} name={tenant.name} timezone={tenant.timezone} />
        </div>
      </section>

      <RolesBoard
        roles={roles}
        canManage
        endpoints={{
          list: `/api/admin/tenants/${tenant.id}/roles`,
          item: (roleId) => `/api/admin/tenants/${tenant.id}/roles/${roleId}`,
        }}
      />

      <PeopleBoard
        members={members}
        invites={invites}
        roles={roles}
        canManagePeople
        actorRole="OWNER"
        allowOwnerRole
        endpoints={{
          members: `/api/admin/tenants/${tenant.id}/members`,
          member: (membershipId) => `/api/admin/tenants/${tenant.id}/members/${membershipId}`,
          invites: `/api/admin/tenants/${tenant.id}/invites`,
          invite: (inviteId) => `/api/admin/tenants/${tenant.id}/invites?id=${inviteId}`,
        }}
      />
    </div>
  );
}
