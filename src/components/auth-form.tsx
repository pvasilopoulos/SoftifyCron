"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { loginAction, registerAction } from "@/app/actions/auth";

type Mode = "login" | "register";

export function AuthForm({
  mode,
  inviteToken,
  inviteEmail,
  workspaceName,
  embedded = false,
}: {
  mode: Mode;
  inviteToken?: string;
  inviteEmail?: string;
  workspaceName?: string;
  embedded?: boolean;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, null);
  const joining = Boolean(inviteToken);

  const form = (
    <form className="space-y-4" action={formAction}>
      {inviteToken ? <input type="hidden" name="invite" value={inviteToken} /> : null}
      {mode === "register" ? (
        <>
          <label className="block">
            <span className="field-label">Your name</span>
            <input className="field" name="name" autoComplete="name" required minLength={2} />
          </label>
          {joining ? null : (
            <label className="block">
              <span className="field-label">Organization</span>
              <input
                className="field"
                name="organization"
                autoComplete="organization"
                required
                minLength={2}
              />
            </label>
          )}
        </>
      ) : null}
      <label className="block">
        <span className="field-label">Email</span>
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          defaultValue={inviteEmail}
          required
        />
      </label>
      <label className="block">
        <span className="field-label">Password</span>
        <input
          className="field"
          type="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={mode === "register" ? 8 : 1}
        />
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold w-full" type="submit" disabled={pending}>
        {pending
          ? "Working…"
          : mode === "login"
            ? joining
              ? "Sign in and join"
              : "Enter workspace"
            : joining
              ? `Join ${workspaceName ?? "workspace"}`
              : "Create workspace"}
      </button>
    </form>
  );

  if (embedded) {
    return (
      <div>
        <p className="mb-4 text-sm text-ink-dim">Create an account to accept the invite.</p>
        {form}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-dvh flex-col px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Link href="/">
          <Logo />
        </Link>
        <ThemeToggle compact />
      </div>
      <div className="mx-auto mt-12 w-full max-w-md card p-6 sm:mt-16 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">
          {mode === "login"
            ? joining
              ? "Join workspace"
              : "Welcome back"
            : joining
              ? "Accept invite"
              : "Create a workspace"}
        </p>
        <h1 className="mt-3 font-display text-4xl italic">
          {mode === "login"
            ? "Sign in"
            : joining
              ? workspaceName ?? "You're invited"
              : "Start isolated"}
        </h1>
        <p className="mt-3 text-sm text-ink-dim">
          {mode === "login"
            ? joining
              ? "Sign in with the invited email to join this tenant."
              : "Customer logins stay inside one tenant. Platform admins open the customer list."
            : joining
              ? `This account will join ${workspaceName ?? "the workspace"} as a member.`
              : "Registration creates your tenant, owner account, and empty job board."}
        </p>
        <div className="mt-8">{form}</div>
        <p className="mt-6 text-sm text-ink-dim">
          {mode === "login" ? (
            <>
              No workspace yet?{" "}
              <Link
                className="text-gold"
                href={inviteToken ? `/register?invite=${encodeURIComponent(inviteToken)}` : "/register"}
              >
                Create one
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link
                className="text-gold"
                href={inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : "/login"}
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
