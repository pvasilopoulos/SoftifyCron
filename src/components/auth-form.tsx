"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload =
      mode === "login"
        ? {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          }
        : {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            organization: String(form.get("organization") ?? ""),
          };

    const response = await fetch(
      mode === "login" ? "/api/auth/login" : "/api/auth/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8">
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
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <label className="block">
                <span className="field-label">Your name</span>
                <input className="field" name="name" required minLength={2} />
              </label>
              <label className="block">
                <span className="field-label">Organization</span>
                <input className="field" name="organization" required minLength={2} />
              </label>
            </>
          ) : null}
          <label className="block">
            <span className="field-label">Email</span>
            <input className="field" type="email" name="email" required />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="field"
              type="password"
              name="password"
              required
              minLength={mode === "register" ? 8 : 1}
            />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
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
