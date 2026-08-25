import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { listGroups } from "@/lib/groups";
import { listSecrets } from "@/lib/secrets";
import { listInvites } from "@/lib/invites";
import { membersForClient } from "@/lib/members";
import { canManageRoleCatalog, listTenantRoles } from "@/lib/roles";
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

  const [groups, secrets, invites, members, roles] = await Promise.all([
    listGroups(session.tid),
    canManageSecrets ? listSecrets(session.tid) : Promise.resolve([]),
    canManagePeople ? listInvites(session.tid) : Promise.resolve([]),
    membersForClient(session.tid, session),
    listTenantRoles(session.tid),
  ]);

  return (
    <WorkspaceSettings
      tenant={{ name: tenant.name, slug: tenant.slug, timezone: tenant.timezone }}
      members={members}
      invites={invites}
      roles={roles}
      groups={groups}
      secrets={secrets}
      canManagePeople={canManagePeople}
      canManageRoles={canManageRoleCatalog(session)}
      canEditSettings={canEditSettings}
      canManageSecrets={canManageSecrets}
      canEditJobs={canEditJobs}
      actorRole={session.role}
    />
  );
}
