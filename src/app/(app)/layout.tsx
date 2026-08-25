import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { ensureDefaultGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  await ensureDefaultGroups(session.tid);
  return <AppShell session={session}>{children}</AppShell>;
}
