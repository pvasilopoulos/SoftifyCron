import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
import { WorkspacePanels } from "@/components/workspace-panels";
import { AppearancePanel } from "@/components/appearance-panel";
import { listGroups } from "@/lib/groups";
import { listSecrets } from "@/lib/secrets";
import { listInvites } from "@/lib/invites";
import { canManage } from "@/lib/acl";
import { notFound } from "next/navigation";

export const metadata = { title: "Workspace" };

export default async function SettingsPage() {
  const session = await requireSession();
  const manage = canManage(session.role);
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tid },
    include: {
      memberships: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tenant) notFound();

  const [groups, secrets, invites] = await Promise.all([
    listGroups(session.tid),
    manage ? listSecrets(session.tid) : Promise.resolve([]),
    manage ? listInvites(session.tid) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Tenant</p>
        <h1 className="mt-2 font-display text-4xl italic">Workspace</h1>
      </div>
      <AppearancePanel />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-2xl italic">Details</h2>
          <p className="mt-2 text-sm text-ink-dim">
            Slug <span className="mono text-ink">{tenant.slug}</span>
          </p>
          <div className="mt-6">
            <SettingsForm
              name={tenant.name}
              timezone={tenant.timezone}
              canEdit={manage}
            />
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl italic">Members</h2>
          <ul className="mt-5 space-y-4">
            {tenant.memberships.map((member) => (
              <li key={member.id} className="border-b border-line pb-4 last:border-0">
                <p className="font-medium">{member.user.name}</p>
                <p className="text-sm text-ink-dim">{member.user.email}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gold">
                  {member.role.toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <WorkspacePanels
        groups={groups}
        secrets={secrets}
        invites={invites}
        canManage={manage}
      />
    </div>
  );
}
