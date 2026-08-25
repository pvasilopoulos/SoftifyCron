import { requireTenantSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { ensureDefaultGroups } from "@/lib/groups";
import { ensureDefaultRoles } from "@/lib/roles";
import { listTenantOptions } from "@/lib/admin";
import { listMyWorkspaces } from "@/lib/members";
import { hasPermission } from "@/lib/acl";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireTenantSession();
  await ensureDefaultGroups(session.tid);
  await ensureDefaultRoles(session.tid);
  const workspaces = session.platform
    ? (await listTenantOptions()).map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role: "OWNER",
      }))
    : (await listMyWorkspaces(session.sub)).map((row) => ({
        id: row.tenant.id,
        name: row.tenant.name,
        slug: row.tenant.slug,
        role: row.role,
      }));

  return (
    <AppShell session={session} workspaces={workspaces} canCreateJob={hasPermission(session, "jobs.edit")}>
      {children}
    </AppShell>
  );
}
