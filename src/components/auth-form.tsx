"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { loginAction, registerAction } from "@/app/actions/auth";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="relative z-10 flex min-h-screen flex-col px-6 py-8">
      <Link href="/">
        <Logo />
      </Link>
      <div className="mx-auto mt-16 w-full max-w-md card p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">
          {mode === "login" ? "Welcome back" : "Create a workspace"}
        </p>
        <h1 className="mt-3 font-display text-4xl italic">
          {mode === "login" ? "Sign in" : "Start isolated"}
        </h1>
        <p className="mt-3 text-sm text-ink-dim">
          {mode === "login"
            ? "Every job you touch stays inside your tenant."
            : "Registration creates your tenant, owner account, and empty job board."}
        </p>
        <form className="mt-8 space-y-4" action={formAction}>
          {mode === "register" ? (
            <>
              <label className="block">
                <span className="field-label">Your name</span>
                <input className="field" name="name" autoComplete="name" required minLength={2} />
              </label>
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
            </>
          ) : null}
          <label className="block">
            <span className="field-label">Email</span>
            <input
              className="field"
              type="email"
              name="email"
              autoComplete="email"
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
                ? "Enter workspace"
                : "Create workspace"}
          </button>
        </form>
        <p className="mt-6 text-sm text-ink-dim">
          {mode === "login" ? (
            <>
              No workspace yet?{" "}
              <Link className="text-gold" href="/register">
                Create one
              </Link>
            </>
          ) : (
            <>
              Already registered?{" "}
              <Link className="text-gold" href="/login">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
