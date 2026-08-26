"use client";

import { useActionState, useState } from "react";
import {
  changePasswordAction,
  confirmTotpAction,
  disableTotpAction,
  logoutAllAction,
  rotateRecoveryAction,
  startTotpAction,
} from "@/app/actions/auth";

export function SecurityPanel({
  totpEnabled,
  platform,
}: {
  totpEnabled: boolean;
  platform: boolean;
}) {
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, null);
  const [totpState, totpAction, totpPending] = useActionState(confirmTotpAction, null);
  const [offState, offAction, offPending] = useActionState(disableTotpAction, null);
  const [allState, allAction, allPending] = useActionState(logoutAllAction, null);
  const [recState, recAction, recPending] = useActionState(rotateRecoveryAction, null);

  async function start() {
    setSetupError(null);
    const result = await startTotpAction();
    if ("error" in result) {
      setSetupError(result.error);
      return;
    }
    setSetup(result);
  }

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <h2 className="font-display text-2xl">Password</h2>
        <form className="mt-5 max-w-lg space-y-4" action={pwAction}>
          <label className="block">
            <span className="field-label">Current password</span>
            <input
              className="field"
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block">
            <span className="field-label">New password</span>
            <input
              className="field"
              type="password"
              name="nextPassword"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          {pwState?.error ? <p className="text-sm text-rose">{pwState.error}</p> : null}
          {pwState?.message ? <p className="text-sm text-ink-dim">{pwState.message}</p> : null}
          <button className="btn btn-gold" type="submit" disabled={pwPending}>
            {pwPending ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Authenticator app</h2>
        <p className="mt-2 text-sm text-ink-dim">
          {platform
            ? "Platform admins should turn this on. After password, login asks for a 6-digit code."
            : "Optional extra step after your password."}
        </p>
        {totpEnabled && !setup ? (
          <form className="mt-5 max-w-lg space-y-4" action={offAction}>
            <label className="block">
              <span className="field-label">Password to disable</span>
              <input className="field" type="password" name="password" required />
            </label>
            {offState?.error ? <p className="text-sm text-rose">{offState.error}</p> : null}
            {offState?.message ? <p className="text-sm text-ink-dim">{offState.message}</p> : null}
            <button className="btn btn-danger" type="submit" disabled={offPending}>
              {offPending ? "Disabling…" : "Disable 2FA"}
            </button>
          </form>
        ) : (
          <div className="mt-5 max-w-lg space-y-4">
            {setup ? (
              <>
                <p className="text-sm text-ink-dim">
                  Add this secret in Google Authenticator or similar, then enter a code.
                </p>
                <p className="mono break-all rounded-2xl bg-bg p-3 text-sm">{setup.secret}</p>
                <a className="text-sm text-gold" href={setup.otpauth}>
                  Open in authenticator
                </a>
                <form className="space-y-4" action={totpAction}>
                  <label className="block">
                    <span className="field-label">6-digit code</span>
                    <input className="field" name="code" inputMode="numeric" required minLength={6} />
                  </label>
                  {totpState?.error ? <p className="text-sm text-rose">{totpState.error}</p> : null}
                  {totpState?.message ? (
                    <p className="text-sm text-ink-dim">{totpState.message}</p>
                  ) : null}
                  <button className="btn btn-gold" type="submit" disabled={totpPending}>
                    {totpPending ? "Verifying…" : "Enable 2FA"}
                  </button>
                </form>
              </>
            ) : (
              <button className="btn btn-gold" type="button" onClick={() => void start()}>
                Set up authenticator
              </button>
            )}
            {setupError ? <p className="text-sm text-rose">{setupError}</p> : null}
          </div>
        )}
      </section>

      {totpEnabled ? (
        <section className="card p-6">
          <h2 className="font-display text-2xl">Recovery codes</h2>
          <p className="mt-2 text-sm text-ink-dim">Shown once. Use a code instead of the authenticator if you lose the device.</p>
          <form className="mt-5 max-w-lg space-y-4" action={recAction}>
            <label className="block">
              <span className="field-label">Password</span>
              <input className="field" type="password" name="password" required />
            </label>
            {recState?.error ? <p className="text-sm text-rose">{recState.error}</p> : null}
            {recState?.message ? <p className="mono break-all text-sm text-ink-dim">{recState.message}</p> : null}
            <button className="btn btn-ghost" type="submit" disabled={recPending}>
              {recPending ? "Rotating…" : "Rotate recovery codes"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="card p-6">
        <h2 className="font-display text-2xl">Sessions</h2>
        <p className="mt-2 text-sm text-ink-dim">Sign out every other browser. This session stays signed in.</p>
        <form className="mt-5" action={allAction}>
          {allState?.error ? <p className="text-sm text-rose">{allState.error}</p> : null}
          {allState?.message ? <p className="text-sm text-ink-dim">{allState.message}</p> : null}
          <button className="btn btn-ghost" type="submit" disabled={allPending}>
            {allPending ? "Signing out…" : "Sign out other sessions"}
          </button>
        </form>
      </section>
    </div>
  );
}
