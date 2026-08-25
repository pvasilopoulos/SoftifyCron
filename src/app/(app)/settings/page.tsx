import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceSettings } from "@/components/workspace-settings";
import { listGroups } from "@/lib/groups";
import { listSecrets } from "@/lib/secrets";
import { listInvites } from "@/lib/invites";
import { membersForClient } from "@/lib/members";
import { canManageRoleCatalog, listTenantRoles } from "@/lib/roles";
import { listApiTokens } from "@/lib/api-tokens";
import { hasPermission } from "@/lib/acl";
import { notFound } from "next/navigation";
import { envSmtp } from "@/lib/mail";

export const metadata = { title: "Workspace" };

export default async function SettingsPage() {
  const session = await requireSession();
  const canEditSettings = hasPermission(session, "settings.edit");
  const canManageSecrets = hasPermission(session, "secrets.manage");
  const canManagePeople = hasPermission(session, "people.manage");
  const canEditJobs = hasPermission(session, "jobs.edit");
  const tenant = await prisma.tenant.findUnique({ where: { id: session.tid } });
  if (!tenant) notFound();

  const [groups, secrets, invites, members, roles, tokens, user] = await Promise.all([
    listGroups(session.tid),
    canManageSecrets ? listSecrets(session.tid) : Promise.resolve([]),
    canManagePeople ? listInvites(session.tid) : Promise.resolve([]),
    membersForClient(session.tid, session),
    listTenantRoles(session.tid),
    canEditSettings ? listApiTokens(session.tid) : Promise.resolve([]),
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { totpEnabled: true },
    }),
  ]);

  return (
    <WorkspaceSettings
      tenant={{
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
      }}
      notify={{
        notifyEmail: tenant.notifyEmail ?? "",
        smtpHost: tenant.smtpHost ?? "",
        smtpPort: tenant.smtpPort,
        smtpSecure: tenant.smtpSecure,
        smtpUser: tenant.smtpUser ?? "",
        smtpFrom: tenant.smtpFrom ?? "",
        smtpHasPassword: Boolean(tenant.smtpPassEnc),
        telegramChatId: tenant.telegramChatId ?? "",
        telegramHasToken: Boolean(tenant.telegramBotTokenEnc),
        envSmtp: Boolean(envSmtp()),
      }}
      members={members}
      invites={invites}
      roles={roles}
      groups={groups}
      secrets={secrets}
      tokens={tokens}
      totpEnabled={Boolean(user?.totpEnabled)}
      canManagePeople={canManagePeople}
      canManageRoles={canManageRoleCatalog(session)}
      canEditSettings={canEditSettings}
      canManageSecrets={canManageSecrets}
      canEditJobs={canEditJobs}
      actorRole={session.role}
      platform={session.platform}
    />
  );
}
