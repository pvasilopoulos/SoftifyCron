import { AuthCard } from "@/components/auth-card";
import { PortalLoginForm } from "@/components/portal-login-form";

export const metadata = { title: "Client portal" };

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const copy =
    error === "expired"
      ? "That email link expired. Request a new one."
      : error === "invalid"
        ? "That portal link is invalid or was rotated. Ask your operator for a new one, or use email."
        : "Use the magic link you were given, or ask for a one-time email link so the secret does not stay in the address bar.";
  return (
    <AuthCard kicker="Client portal" title="Open your portal" copy={copy}>
      <PortalLoginForm />
    </AuthCard>
  );
}
