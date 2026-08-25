import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getInviteByToken } from "@/lib/invites";
import { getSession, homePath } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const session = await getSession();
  if (session && !invite) redirect(homePath(session));
  const record = invite ? await getInviteByToken(invite) : null;
  return (
    <AuthForm
      mode="login"
      inviteToken={record ? invite : undefined}
      inviteEmail={record?.email}
      workspaceName={record?.tenant.name}
    />
  );
}
