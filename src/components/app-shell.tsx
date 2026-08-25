"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionPayload } from "@/lib/session";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenantSwitcher, type WorkspaceChoice } from "@/components/tenant-switcher";
import { SignOutButton } from "@/components/sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/jobs", label: "Jobs", icon: JobsIcon },
  { href: "/runs", label: "Runs", icon: RunsIcon },
  { href: "/settings#people", label: "People", icon: PeopleIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function JobsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function RunsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 18.5c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16.2 14.2c1.7.3 3 1.5 3.4 3.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4 16.2 7.8M7.8 16.2 6.4 17.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function openPalette() {
  window.dispatchEvent(new Event("sc-open-palette"));
}

export function AppShell({
  session,
  workspaces,
  canCreateJob,
  children,
}: {
  session: SessionPayload;
  workspaces: WorkspaceChoice[];
  canCreateJob: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="app-rail">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <TenantSwitcher
          currentId={session.tid}
          currentName={session.tname}
          currentSlug={session.tslug}
          workspaces={workspaces}
          platform={session.platform}
        />
        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
            const path = item.href.split("#")[0] ?? item.href;
            const active =
              item.href.includes("#")
                ? false
                : path === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === path || pathname.startsWith(`${path}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`rail-link${active ? " is-on" : ""}`}>
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2">
          {canCreateJob ? (
            <Link href="/jobs/new" className="btn btn-gold w-full">
              New job
            </Link>
          ) : null}
          <button type="button" className="rail-link w-full" onClick={openPalette}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Search
            <span className="ml-auto text-[10px] tracking-[0.14em] text-ink-dim">⌘K</span>
          </button>
        </div>
        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-start gap-2">
            <span className="rail-avatar">{session.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{session.name}</p>
              <p className="truncate text-xs text-ink-dim">{session.email}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-gold">
                {session.platform ? "platform admin" : session.role.toLowerCase()}
              </p>
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
          <Link href="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <TenantSwitcher
              compact
              currentId={session.tid}
              currentName={session.tname}
              currentSlug={session.tslug}
              workspaces={workspaces}
              platform={session.platform}
            />
          </div>
        </header>
        <header className="hidden items-center justify-between border-b border-line px-10 py-4 lg:flex">
          <p className="text-sm text-ink-dim">
            {session.platform
              ? `Viewing ${session.tname} as platform admin`
              : `${session.tname} · ${session.role.toLowerCase()}`}
          </p>
          <button type="button" className="text-sm text-ink-dim hover:text-ink" onClick={openPalette}>
            Jump anywhere · ⌘K
          </button>
        </header>
        <main className="px-4 py-6 lg:px-10 lg:py-10">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg-elev/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        {NAV.filter((item) => !item.href.includes("#")).map((item) => {
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
