import { requirePlatformAdmin } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";
import { listTenantOptions } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformAdmin();
  const workspaces = (await listTenantOptions()).map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    role: "OWNER",
  }));
  return (
    <AdminShell session={session} workspaces={workspaces}>
      {children}
    </AdminShell>
  );
}
