import Link from "next/link";
import { getInviteByToken } from "@/lib/invites";
import { getSession } from "@/lib/session";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";
import { acceptInviteAction } from "@/app/actions/auth";

export const metadata = { title: "Invite" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await getInviteByToken(token);
  const session = await getSession();

  if (!invite) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <Logo />
        <h1 className="mt-8 font-display text-4xl">Invite expired</h1>
        <p className="mt-3 text-ink-dim">Ask an admin to send a new link.</p>
        <Link href="/login" className="btn btn-gold mt-6 w-fit">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <div className="card mt-12 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">You&apos;re invited</p>
        <h1 className="mt-3 font-display text-4xl">{invite.tenant.name}</h1>
        <p className="mt-3 text-sm text-ink-dim">
          This link is for <span className="text-ink">{invite.email}</span> as{" "}
          {(invite.roleRef?.name ?? invite.role).toLowerCase()}.
        </p>
        {error ? <p className="mt-4 text-sm text-rose">{error}</p> : null}
        {session ? (
          <form className="mt-6" action={acceptInviteAction}>
            <input type="hidden" name="invite" value={token} />
            <button className="btn btn-gold w-full" type="submit">
              Join {invite.tenant.name}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-6">
            <AuthForm
              mode="register"
              inviteToken={token}
              inviteEmail={invite.email}
              workspaceName={invite.tenant.name}
            />
            <p className="text-center text-sm text-ink-dim">
              Already have an account?{" "}
              <Link className="text-gold" href={`/login?invite=${encodeURIComponent(token)}`}>
                Sign in to join
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
