"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import type { SessionPayload } from "@/lib/session-token";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenantSwitcher, type WorkspaceChoice } from "@/components/tenant-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { MobileNav } from "@/components/mobile-nav";
import { NAV_ICONS } from "@/components/nav-icons";
import { RailGroup } from "@/components/rail-group";
import { groupedNav, isNavActive, navForSession, type NavItem } from "@/lib/nav";

function useHash() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      window.addEventListener("popstate", onChange);
      return () => {
        window.removeEventListener("hashchange", onChange);
        window.removeEventListener("popstate", onChange);
      };
    },
    () => window.location.hash,
    () => "",
  );
}

function openPalette() {
  window.dispatchEvent(new Event("sc-open-palette"));
}

function NavLink({
  item,
  pathname,
  hash,
}: {
  item: NavItem;
  pathname: string;
  hash: string;
}) {
  const Icon = NAV_ICONS[item.id];
  const active = isNavActive(pathname, hash, item);
  const [, itemHash] = item.href.split("#");
  return (
    <Link
      href={item.href}
      className={`rail-link${active ? " is-on" : ""}`}
      onClick={() => {
        if (!itemHash) return;
        window.setTimeout(() => {
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }, 0);
      }}
    >
      <Icon />
      {item.label}
    </Link>
  );
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
  const hash = useHash();
  const items = navForSession(session.platform);
  const groups = groupedNav(items);

  const extras = (
    <>
      {canCreateJob ? (
        <Link href="/jobs/new" className="btn btn-gold w-full">
          New job
        </Link>
      ) : null}
      {session.platform ? (
        <Link href="/admin/tenants/new" className="btn btn-ghost w-full">
          New tenant
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
    </>
  );

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
        <div className="rail-scroll">
          <nav className="mt-5" aria-label="Workspace">
            {groups.map((group) => (
              <RailGroup key={group.id} id={group.id} label={group.label}>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.id} item={item} pathname={pathname} hash={hash} />
                  ))}
                </div>
              </RailGroup>
            ))}
            <RailGroup id="actions" label="Actions">
              <div className="space-y-2">{extras}</div>
            </RailGroup>
          </nav>
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
        <header className="stage-header sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-3 sm:px-4 lg:hidden">
          <Link href="/dashboard" className="min-w-0 shrink">
            <Logo />
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2">
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
        <header className="stage-header hidden items-center justify-between px-10 py-4 lg:flex">
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

      <MobileNav
        items={items}
        extra={
          <div className="space-y-2">
            {canCreateJob ? (
              <Link href="/jobs/new" className="btn btn-gold w-full">
                New job
              </Link>
            ) : null}
            {session.platform ? (
              <Link href="/admin/tenants/new" className="btn btn-ghost w-full">
                New tenant
              </Link>
            ) : null}
            <button type="button" className="btn btn-ghost w-full" onClick={openPalette}>
              Search
            </button>
          </div>
        }
      />
    </div>
  );
}
