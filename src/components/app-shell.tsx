"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionPayload } from "@/lib/session";
import { Logo } from "@/components/logo";
import { logoutAction } from "@/app/actions/auth";
import { exitCustomerAction } from "@/app/actions/admin";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/jobs", label: "Jobs", icon: JobsIcon },
  { href: "/runs", label: "Runs", icon: RunsIcon },
  { href: "/settings", label: "Settings", icon: MoreIcon },
];

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function JobsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function RunsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-bg-elev/90 px-6 py-8 lg:flex lg:flex-col">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-ink-dim">{session.tslug}</p>
        <p className="mt-1 truncate font-display text-xl text-ink">{session.tname}</p>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-3 py-3 text-sm ${
                  active ? "bg-gold/12 text-gold-2" : "text-ink-dim hover:bg-bg-mute hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-6">
          <p className="truncate text-sm">{session.name}</p>
          <p className="truncate text-xs text-ink-dim">{session.email}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gold">
            {session.platform ? "platform admin" : session.role.toLowerCase()}
          </p>
          {session.platform ? (
            <form action={exitCustomerAction}>
              <button type="submit" className="mt-3 text-xs uppercase tracking-[0.16em] text-gold">
                All customers
              </button>
            </form>
          ) : null}
          <form action={logoutAction}>
            <button type="submit" className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-dim hover:text-gold">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href="/dashboard">
            <Logo />
          </Link>
          {session.platform ? (
            <form action={exitCustomerAction}>
              <button type="submit" className="text-xs text-gold">
                Customers
              </button>
            </form>
          ) : (
            <p className="max-w-[45%] truncate text-xs text-ink-dim">{session.tname}</p>
          )}
        </header>
        <header className="hidden items-center justify-between border-b border-line px-10 py-4 lg:flex">
          <p className="text-sm text-ink-dim">
            {session.platform
              ? `Viewing customer ${session.tname} as platform admin`
              : `Customer workspace · ${session.role.toLowerCase()}`}
          </p>
          {session.platform ? (
            <form action={exitCustomerAction}>
              <button type="submit" className="text-sm text-gold">
                Back to customers
              </button>
            </form>
          ) : null}
        </header>
        <main className="px-4 py-6 lg:px-10 lg:py-10">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg-elev/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "text-gold" : "text-ink-dim"
              }`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
