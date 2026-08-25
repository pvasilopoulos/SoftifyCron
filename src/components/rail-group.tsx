"use client";

import { useSyncExternalStore } from "react";
import {
  isRailGroupExpanded,
  persistRailGroupExpanded,
  readRailGroups,
} from "@/lib/nav";

function subscribeRailGroups(onChange: () => void) {
  window.addEventListener("sc-appearance", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("sc-appearance", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function RailGroup({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const expanded = useSyncExternalStore(
    subscribeRailGroups,
    () => isRailGroupExpanded(id, readRailGroups()),
    () => true,
  );

  return (
    <section className={`rail-group${expanded ? "" : " is-collapsed"}`}>
      <button
        type="button"
        className="rail-group-label"
        aria-expanded={expanded}
        onClick={() => persistRailGroupExpanded(id, !expanded)}
      >
        <span>{label}</span>
        <svg
          className="rail-group-chevron"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden
        >
          <path
            d="M2 3.5 5 6.5 8 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded ? children : null}
    </section>
  );
}
