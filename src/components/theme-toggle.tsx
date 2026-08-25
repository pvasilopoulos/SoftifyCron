"use client";

import { useEffect, useState } from "react";
import {
  applyAppearance,
  persistTheme,
  readDensity,
  readThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 3.2A8.6 8.6 0 1 0 20.8 14 7 7 0 0 1 16 3.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 16h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Icon({ value }: { value: ThemePreference }) {
  if (value === "light") return <SunIcon />;
  if (value === "dark") return <MoonIcon />;
  return <AutoIcon />;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance(readThemePreference(), readDensity());
    const sync = () => setPref(readThemePreference());
    mq.addEventListener("change", onChange);
    window.addEventListener("sc-appearance", sync);
    const frame = window.requestAnimationFrame(() => {
      const current = readThemePreference();
      setPref(current);
      applyAppearance(current, readDensity());
    });
    return () => {
      window.cancelAnimationFrame(frame);
      mq.removeEventListener("change", onChange);
      window.removeEventListener("sc-appearance", sync);
    };
  }, []);

  function choose(next: ThemePreference) {
    setPref(next);
    persistTheme(next);
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={pref === option.value}
          title={option.label}
          className={pref === option.value ? "is-on" : ""}
          onClick={() => choose(option.value)}
        >
          <Icon value={option.value} />
          {compact ? <span className="sr-only">{option.label}</span> : <span>{option.label}</span>}
        </button>
      ))}
    </div>
  );
}
