"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/app/actions/auth";
import type { SessionPayload } from "@/lib/session";

export function AdminShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-bg-elev/90 px-6 py-8 lg:flex lg:flex-col">
        <Link href="/admin">
          <Logo />
        </Link>
        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-ink-dim">Platform</p>
        <p className="mt-1 font-display text-xl">All customers</p>
        <nav className="mt-8 flex flex-col gap-1">
          <Link href="/admin" className="rounded-2xl bg-gold/12 px-3 py-3 text-sm text-gold-2">
            Customers
          </Link>
        </nav>
        <div className="mt-auto border-t border-line pt-6">
          <p className="truncate text-sm">{session.name}</p>
          <p className="truncate text-xs text-ink-dim">{session.email}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gold">superadmin</p>
          <form action={logoutAction}>
            <button type="submit" className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-dim hover:text-gold">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href="/admin">
            <Logo />
          </Link>
          <p className="text-xs text-ink-dim">Admin</p>
        </header>
        <main className="px-4 py-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
