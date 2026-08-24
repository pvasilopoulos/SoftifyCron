"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/session";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/jobs", label: "Jobs" },
  { href: "/runs", label: "Run history" },
  { href: "/settings", label: "Workspace" },
];

export function AppShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-bg-elev/80 px-5 py-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-ink-dim">
          {session.tslug}
        </p>
        <p className="mt-1 truncate font-display text-lg text-ink">{session.tname}</p>
        <nav className="mt-8 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  active
                    ? "bg-gold/15 text-gold-2"
                    : "text-ink-dim hover:bg-bg-mute hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 hidden border-t border-line pt-6 lg:block">
          <p className="truncate text-sm text-ink">{session.name}</p>
          <p className="truncate text-xs text-ink-dim">{session.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-4 text-xs uppercase tracking-[0.16em] text-ink-dim hover:text-gold"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line px-5 py-4 lg:px-10">
          <p className="text-sm text-ink-dim">
            Tenant-scoped scheduler · {session.role.toLowerCase()}
          </p>
          <button
            type="button"
            onClick={logout}
            className="text-xs uppercase tracking-[0.16em] text-ink-dim hover:text-gold lg:hidden"
          >
            Sign out
          </button>
        </header>
        <main className="px-5 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
