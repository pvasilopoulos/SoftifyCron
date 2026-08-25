"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  fillFooterNav,
  groupedNav,
  isNavActive,
  readFooterNav,
  DEFAULT_FOOTER_NAV,
  type NavId,
  type NavItem,
} from "@/lib/nav";
import { MoreIcon, NAV_ICONS } from "@/components/nav-icons";

function subscribeAppearance(onChange: () => void) {
  window.addEventListener("sc-appearance", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("sc-appearance", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function useFooterPins(allowed: NavId[]) {
  const snapshot = useSyncExternalStore(
    subscribeAppearance,
    () => JSON.stringify(readFooterNav(allowed)),
    () => JSON.stringify(fillFooterNav(DEFAULT_FOOTER_NAV, allowed)),
  );
  return JSON.parse(snapshot) as NavId[];
}

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

export function MobileNav({
  items,
  extra,
}: {
  items: NavItem[];
  extra?: React.ReactNode;
}) {
  const pathname = usePathname();
  const hash = useHash();
  const route = `${pathname}${hash}`;
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === route;
  const allowed = items.map((item) => item.id);
  const pins = useFooterPins(allowed);
  const byId = new Map(items.map((item) => [item.id, item]));
  const pinned = pins.map((id) => byId.get(id)).filter(Boolean) as NavItem[];
  const groups = groupedNav(items);

  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg-elev/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        {pinned.map((item) => {
          const Icon = NAV_ICONS[item.id];
          const active = isNavActive(pathname, hash, item);
          return (
            <Link
              key={item.id}
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
        <button
          type="button"
          className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${
            open ? "text-gold" : "text-ink-dim"
          }`}
          aria-expanded={open}
          onClick={() => setOpenedOn(route)}
        >
          <MoreIcon />
          More
        </button>
      </nav>

      {open ? (
        <div className="nav-sheet-backdrop lg:hidden" onClick={() => setOpenedOn(null)}>
          <div
            className="nav-sheet"
            role="dialog"
            aria-label="All pages"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-ink-dim">All pages</p>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpenedOn(null)}>
                Close
              </button>
            </div>
            <div className="mt-4 space-y-5">
              {groups.map((group) => (
                <section key={group.id}>
                  <p className="rail-group-label">{group.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = NAV_ICONS[item.id];
                      const active = isNavActive(pathname, hash, item);
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`rail-link ${active ? "is-on" : ""}`}
                          onClick={() => setOpenedOn(null)}
                        >
                          <Icon />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
              {extra ? <section className="space-y-2">{extra}</section> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
