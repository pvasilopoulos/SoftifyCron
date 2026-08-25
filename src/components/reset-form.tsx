"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  if (!token) {
    return <p className="text-sm text-rose">This reset link is missing a token.</p>;
  }
  return (
    <form className="space-y-4" action={action}>
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="field-label">New password</span>
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </label>
      {state?.error ? <p className="text-sm text-rose">{state.error}</p> : null}
      <button className="btn btn-gold w-full" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
