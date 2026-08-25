import { AuthCard } from "@/components/auth-card";
import { ResetForm } from "@/components/reset-form";

export const metadata = { title: "Set a new password" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthCard
      kicker="Account"
      title="New password"
      copy="Choose a password at least 8 characters long."
    >
      <ResetForm token={token ?? ""} />
    </AuthCard>
  );
}
