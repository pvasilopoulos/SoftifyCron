import { requirePlatformAdmin } from "@/lib/session";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformAdmin();
  return <AdminShell session={session}>{children}</AdminShell>;
}
