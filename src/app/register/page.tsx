import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getInviteByToken } from "@/lib/invites";
import { getSession, homePath } from "@/lib/session";

export const metadata = { title: "Create workspace" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const session = await getSession();
  if (session && invite) {
    redirect(`/invite/${encodeURIComponent(invite)}`);
  }
  if (session) redirect(homePath(session));
  const record = invite ? await getInviteByToken(invite) : null;
  return (
    <AuthForm
      mode="register"
      inviteToken={record ? invite : undefined}
      inviteEmail={record?.email}
      workspaceName={record?.tenant.name}
    />
  );
}
