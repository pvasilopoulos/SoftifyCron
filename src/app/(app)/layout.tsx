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
  const [workspaces] = await Promise.all([
    session.platform
      ? listTenantOptions().then((tenants) =>
          tenants.map((tenant) => ({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            role: "OWNER",
          })),
        )
      : listMyWorkspaces(session.sub).then((rows) =>
          rows.map((row) => ({
            id: row.tenant.id,
            name: row.tenant.name,
            slug: row.tenant.slug,
            role: row.role,
          })),
        ),
    ensureDefaultGroups(session.tid),
    ensureDefaultRoles(session.tid),
  ]);

  return (
    <AppShell session={session} workspaces={workspaces} canCreateJob={hasPermission(session, "jobs.edit")}>
      {children}
    </AppShell>
  );
}
