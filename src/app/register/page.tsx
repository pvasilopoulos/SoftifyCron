import { AuthForm } from "@/components/auth-form";
import { getInviteByToken } from "@/lib/invites";

export const metadata = { title: "Create workspace" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
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
