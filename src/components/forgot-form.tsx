"use client";

import { useActionState } from "react";
import { forgotAction } from "@/app/actions/auth";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotAction, null);
  return (
    <form className="space-y-4" action={action}>
      <label className="block">
        <span className="field-label">Email</span>
        <input className="field" type="email" name="email" autoComplete="email" required />
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-ink-dim">{state.message}</p> : null}
      <button className="btn btn-gold w-full" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
