import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
import { WorkspacePanels } from "@/components/workspace-panels";
import { AppearancePanel } from "@/components/appearance-panel";
import { PeopleBoard } from "@/components/people-board";
import { listGroups } from "@/lib/groups";
import { listSecrets } from "@/lib/secrets";
import { listInvites } from "@/lib/invites";
import { membersForClient } from "@/lib/members";
import { hasPermission } from "@/lib/acl";
import { notFound } from "next/navigation";

export const metadata = { title: "Workspace" };

export default async function SettingsPage() {
  const session = await requireSession();
  const canEditSettings = hasPermission(session, "settings.edit");
  const canManageSecrets = hasPermission(session, "secrets.manage");
  const canManagePeople = hasPermission(session, "people.manage");
  const canEditJobs = hasPermission(session, "jobs.edit");
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  if (!tenant) notFound();

  const [groups, secrets, invites, members] = await Promise.all([
    listGroups(session.tid),
    canManageSecrets ? listSecrets(session.tid) : Promise.resolve([]),
    canManagePeople ? listInvites(session.tid) : Promise.resolve([]),
    membersForClient(session.tid, session),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Tenant</p>
        <h1 className="mt-2 font-display text-4xl italic">Workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-dim">
          Roles set the baseline. Owners can grant extra permissions to members without promoting them.
        </p>
      </div>
      <div id="people">
        <PeopleBoard
          members={members}
          invites={invites}
          canManagePeople={canManagePeople}
          actorRole={session.role}
        />
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
              canEdit={canEditSettings}
            />
          </div>
        </div>
      </div>
      <WorkspacePanels
        groups={groups}
        secrets={secrets}
        canManage={canEditJobs}
        canManageSecrets={canManageSecrets}
      />
    </div>
  );
}
