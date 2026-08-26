import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/admin";
import { listInvites } from "@/lib/invites";
import { membersForClient } from "@/lib/members";
import { requirePlatformAdmin } from "@/lib/session";
import { enterCustomerAction } from "@/app/actions/admin";
import { DeleteTenantButton } from "@/components/delete-tenant-button";
import { listTenantRoles } from "@/lib/roles";
import { AdminTenantBoards } from "@/components/admin-tenant-boards";
import { TenantDetailsForm } from "@/components/tenant-details-form";
import { formatDateTime } from "@/lib/format";
import { NotificationsPanel } from "@/components/notifications-panel";
import { publicNotify } from "@/lib/tenant-notify";

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
          <h1 className="mt-2 font-display text-4xl">{tenant.name}</h1>
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
          <DeleteTenantButton id={tenant.id} name={tenant.name} />
        </div>
      </div>

      <section className="card p-5 sm:p-6 max-w-lg">
        <h2 className="font-display text-2xl">Tenant details</h2>
        <div className="mt-6">
          <TenantDetailsForm tenantId={tenant.id} name={tenant.name} timezone={tenant.timezone} />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl">Notifications</h2>
          <p className="mt-1 text-sm text-ink-dim">
            SMTP, Telegram, Slack, Discord, SMS, and default event matrix for this workspace.
          </p>
        </div>
        <NotificationsPanel
          canEdit
          endpoint={`/api/admin/tenants/${tenant.id}/notify`}
          telegramEndpoint={`/api/admin/tenants/${tenant.id}/notify/telegram`}
          initial={publicNotify(tenant)}
        />
      </section>

      <AdminTenantBoards
        tenantId={tenant.id}
        members={members.map((member) => ({
          ...member,
          createdAt: member.createdAt instanceof Date ? member.createdAt.toISOString() : member.createdAt,
        }))}
        invites={invites.map((invite) => ({
          ...invite,
          expiresAt: invite.expiresAt instanceof Date ? invite.expiresAt.toISOString() : invite.expiresAt,
        }))}
        roles={roles.map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          system: role.system,
          locked: role.locked,
          sortOrder: role.sortOrder,
          _count: role._count,
        }))}
      />
    </div>
  );
}
