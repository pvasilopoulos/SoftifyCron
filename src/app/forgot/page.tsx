import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "@/components/forgot-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <AuthCard
      kicker="Account"
      title="Reset password"
      copy="We’ll email a reset link if that address has an account."
    >
      <ForgotForm />
    </AuthCard>
  );
}
