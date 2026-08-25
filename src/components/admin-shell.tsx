"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { TenantSwitcher, type WorkspaceChoice } from "@/components/tenant-switcher";
import type { SessionPayload } from "@/lib/session-token";

const NAV = [
  { href: "/admin", label: "Tenants", match: (path: string) => path === "/admin" || path.startsWith("/admin/tenants") },
  { href: "/admin/users", label: "Users", match: (path: string) => path.startsWith("/admin/users") },
];

export function AdminShell({
  session,
  workspaces,
  children,
}: {
  session: SessionPayload;
  workspaces: WorkspaceChoice[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const parts = pathname.split("/");
  const maybeId = parts[1] === "admin" && parts[2] === "tenants" ? (parts[3] ?? "") : "";
  const currentId = maybeId && maybeId !== "new" ? maybeId : "";
  const current = workspaces.find((row) => row.id === currentId);

  return (
    <div className="app-frame">
      <aside className="app-rail">
        <Link href="/admin">
          <Logo />
        </Link>
        <TenantSwitcher
          currentId={currentId}
          currentName={current?.name ?? "All tenants"}
          currentSlug={current?.slug ?? "platform"}
          workspaces={workspaces}
          platform
          intent="manage"
        />
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rail-link${active ? " is-on" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2">
          <Link href="/admin/tenants/new" className="btn btn-gold w-full">
            New tenant
          </Link>
          <Link href="/admin/users/new" className="btn btn-ghost w-full">
            New user
          </Link>
        </div>
        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-start gap-2">
            <span className="rail-avatar">{session.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{session.name}</p>
              <p className="truncate text-xs text-ink-dim">{session.email}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-gold">superadmin</p>
            </div>
            <SignOutButton />
          </div>
          <div className="mt-3">
            <ThemeToggle compact />
          </div>
        </div>
      </aside>
      <div className="app-stage">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href="/admin">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <TenantSwitcher
              compact
              intent="manage"
              currentId={currentId}
              currentName={current?.name ?? "All tenants"}
              currentSlug={current?.slug ?? "platform"}
              workspaces={workspaces}
              platform
            />
          </div>
        </header>
        <header className="hidden items-center justify-between border-b border-line px-10 py-4 lg:flex">
          <p className="text-sm text-ink-dim">Platform · tenants and users</p>
          <ThemeToggle />
        </header>
        <main className="px-4 py-6 lg:px-10 lg:py-10">{children}</main>
      </div>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-line bg-bg-elev/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 items-center justify-center text-sm ${
                active ? "text-gold" : "text-ink-dim"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
